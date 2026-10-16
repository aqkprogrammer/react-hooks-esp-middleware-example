import { useCallback, useEffect, useReducer, useRef } from 'react';
import { isBrowser, toError } from '../internal/env';
import { useLatest } from '../state/useLatest';
import { useBrowserSupport } from './support';

// The Web Speech API's recognition half is not in TypeScript's DOM library,
// so the minimal surface used here is declared locally.

interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternativeLike | undefined;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    readonly [index: number]: SpeechRecognitionResultLike | undefined;
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
  readonly message: string;
}

/** The subset of `SpeechRecognition` this hook uses. */
export interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

/**
 * Error codes from the spec, plus `start-failed` when `start()` throws.
 * - `not-allowed`: microphone permission denied (or the page is not a secure context).
 * - `service-not-allowed`: the browser/OS refused the recognition service.
 * - `no-speech`, `audio-capture` (no microphone), `network` (server-based engines),
 *   `language-not-supported`.
 */
export type SpeechRecognitionErrorCode =
  | 'no-speech'
  | 'audio-capture'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'network'
  | 'language-not-supported'
  | 'start-failed'
  | (string & {});

export interface SpeechRecognitionErrorInfo {
  code: SpeechRecognitionErrorCode;
  message: string;
}

export type SpeechRecognitionStatus = 'idle' | 'starting' | 'listening' | 'stopping';

export interface SpeechRecognitionResultInfo {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface UseSpeechRecognitionOptions {
  /** BCP 47 language tag, e.g. `en-US`. Defaults to the document language. */
  lang?: string;
  /** Keep listening after the first phrase (default `false`). */
  continuous?: boolean;
  /** Deliver partial results while the user is speaking (default `true`). */
  interimResults?: boolean;
  /** Called for every result (interim and final) with the top alternative. */
  onResult?: (result: SpeechRecognitionResultInfo) => void;
}

export interface SpeechRecognitionControls {
  /** `SpeechRecognition` or `webkitSpeechRecognition` exists. */
  isSupported: boolean;
  status: SpeechRecognitionStatus;
  /** Shorthand for `status === 'listening'`. */
  listening: boolean;
  /** All final results since the last `reset()`, joined with spaces. */
  transcript: string;
  /** The phrase currently being recognised (replaced on every result). */
  interimTranscript: string;
  error: SpeechRecognitionErrorInfo | null;
  /** Starts listening. The first call prompts for microphone access — call it from a click. */
  start: () => void;
  /** Stops listening and delivers the final result for audio captured so far. */
  stop: () => void;
  /** Stops listening and discards pending audio. */
  abort: () => void;
  /** Clears the transcript and error. */
  reset: () => void;
}

interface State {
  status: SpeechRecognitionStatus;
  transcript: string;
  interimTranscript: string;
  error: SpeechRecognitionErrorInfo | null;
}

type Action =
  | { type: 'starting' }
  | { type: 'started' }
  | { type: 'stopping' }
  | { type: 'result'; finalText: string; interim: string }
  | { type: 'error'; error: SpeechRecognitionErrorInfo }
  | { type: 'ended' }
  | { type: 'reset' };

const initialState: State = { status: 'idle', transcript: '', interimTranscript: '', error: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'starting':
      return { ...state, status: 'starting', interimTranscript: '', error: null };
    case 'started':
      return { ...state, status: 'listening' };
    case 'stopping':
      return state.status === 'idle' ? state : { ...state, status: 'stopping' };
    case 'result':
      return {
        ...state,
        transcript: [state.transcript, action.finalText.trim()].filter(Boolean).join(' '),
        interimTranscript: action.interim,
      };
    case 'error':
      return { ...state, error: action.error };
    case 'ended':
      return { ...state, status: 'idle', interimTranscript: '' };
    case 'reset':
      return { ...state, transcript: '', interimTranscript: '', error: null };
  }
}

function getConstructor(): SpeechRecognitionConstructor | undefined {
  if (!isBrowser) return undefined;
  const speechWindow = window as WindowWithSpeech;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

const detect = () => getConstructor() !== undefined;

/**
 * Speech-to-text with the Web Speech API.
 *
 * **Support:** Chromium-based browsers and Safari (prefixed as
 * `webkitSpeechRecognition`); not Firefox. Check `isSupported` and offer a
 * text input instead.
 *
 * **Permissions:** nothing happens on mount. The browser asks for microphone
 * access the first time `start()` runs, so call it from a user action.
 * A denied prompt surfaces as `error.code === 'not-allowed'`.
 *
 * **Privacy:** Chrome sends the audio to a server-based recognition service
 * (Safari may use on-device or server recognition). Tell users before they
 * start and do not use it for sensitive input.
 *
 * Option changes take effect on the next `start()`. The session is aborted
 * when the component unmounts.
 */
export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {},
): SpeechRecognitionControls {
  const isSupported = useBrowserSupport(detect);
  const [state, dispatch] = useReducer(reducer, initialState);
  const optionsRef = useLatest(options);
  const recognitionRef = useRef<{ instance: SpeechRecognitionLike; detach: () => void } | null>(
    null,
  );

  const start = useCallback(() => {
    const Recognition = getConstructor();
    if (!Recognition || recognitionRef.current) return;
    const { lang, continuous = false, interimResults = true } = optionsRef.current;

    const instance = new Recognition();
    instance.lang = lang ?? document.documentElement.lang;
    instance.continuous = continuous;
    instance.interimResults = interimResults;
    instance.maxAlternatives = 1;

    const onStart = () => dispatch({ type: 'started' });
    const onResult = (event: Event) => {
      const { results, resultIndex } = event as SpeechRecognitionEventLike;
      let finalText = '';
      let interim = '';
      for (let index = resultIndex; index < results.length; index += 1) {
        const result = results[index];
        const best = result?.[0];
        if (!result || !best) continue;
        if (result.isFinal) finalText += best.transcript;
        else interim += best.transcript;
        optionsRef.current.onResult?.({
          transcript: best.transcript,
          confidence: best.confidence,
          isFinal: result.isFinal,
        });
      }
      dispatch({ type: 'result', finalText, interim });
    };
    const onError = (event: Event) => {
      const { error, message } = event as SpeechRecognitionErrorEventLike;
      // `aborted` is the expected outcome of abort(); it is not a failure.
      if (error === 'aborted') return;
      dispatch({ type: 'error', error: { code: error, message: message || error } });
    };
    const detach = () => {
      instance.removeEventListener('start', onStart);
      instance.removeEventListener('result', onResult);
      instance.removeEventListener('error', onError);
      instance.removeEventListener('end', onEnd);
    };
    const onEnd = () => {
      detach();
      if (recognitionRef.current?.instance === instance) recognitionRef.current = null;
      dispatch({ type: 'ended' });
    };

    instance.addEventListener('start', onStart);
    instance.addEventListener('result', onResult);
    instance.addEventListener('error', onError);
    instance.addEventListener('end', onEnd);

    recognitionRef.current = { instance, detach };
    dispatch({ type: 'starting' });
    try {
      instance.start();
    } catch (error) {
      detach();
      recognitionRef.current = null;
      dispatch({
        type: 'error',
        error: { code: 'start-failed', message: toError(error).message },
      });
      dispatch({ type: 'ended' });
    }
  }, [optionsRef]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    dispatch({ type: 'stopping' });
    recognitionRef.current.instance.stop();
  }, []);

  const abort = useCallback(() => {
    if (!recognitionRef.current) return;
    dispatch({ type: 'stopping' });
    recognitionRef.current.instance.abort();
  }, []);

  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  useEffect(
    () => () => {
      const current = recognitionRef.current;
      recognitionRef.current = null;
      if (current) {
        current.detach();
        current.instance.abort();
      }
    },
    [],
  );

  return {
    isSupported,
    status: state.status,
    listening: state.status === 'listening',
    transcript: state.transcript,
    interimTranscript: state.interimTranscript,
    error: state.error,
    start,
    stop,
    abort,
    reset,
  };
}
