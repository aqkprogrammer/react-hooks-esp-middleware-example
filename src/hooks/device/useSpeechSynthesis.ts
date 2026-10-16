import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { isBrowser, noop } from '../internal/env';
import { useBrowserSupport } from './support';

export interface SpeakOptions {
  /** A voice from `voices`. Defaults to the browser's default voice for `lang`. */
  voice?: SpeechSynthesisVoice | null;
  /** BCP 47 language tag. Defaults to the voice's or the document's language. */
  lang?: string;
  /** 0.1 – 10, default 1. */
  rate?: number;
  /** 0 – 2, default 1. */
  pitch?: number;
  /** 0 – 1, default 1. */
  volume?: number;
  /**
   * Append to the browser's queue instead of interrupting what is currently
   * being spoken. Default `false` (interrupt).
   */
  queue?: boolean;
}

export interface SpeechSynthesisControls {
  /** `speechSynthesis` and `SpeechSynthesisUtterance` exist. */
  isSupported: boolean;
  /**
   * Installed voices. Often empty on the first render: Chromium loads them
   * asynchronously and announces them with `voiceschanged`.
   */
  voices: readonly SpeechSynthesisVoice[];
  /** An utterance started by this hook is being spoken (or is paused). */
  speaking: boolean;
  paused: boolean;
  /** The last synthesis error, e.g. `not-allowed` when there was no user gesture. */
  error: string | null;
  /** Speaks `text`. Returns `false` when unsupported or `text` is blank. */
  speak: (text: string, options?: SpeakOptions) => boolean;
  /** Stops speaking and clears the queue (this is page-wide: it affects every utterance). */
  cancel: () => void;
  pause: () => void;
  resume: () => void;
}

const EMPTY_VOICES: readonly SpeechSynthesisVoice[] = [];
let cachedVoices: readonly SpeechSynthesisVoice[] = EMPTY_VOICES;

function getSynth(): SpeechSynthesis | null {
  if (!isBrowser || typeof window.speechSynthesis === 'undefined') return null;
  return window.speechSynthesis;
}

const detect = () => getSynth() !== null && typeof SpeechSynthesisUtterance === 'function';

function subscribeVoices(onChange: () => void): () => void {
  const synth = getSynth();
  if (!synth || typeof synth.addEventListener !== 'function') return noop;
  synth.addEventListener('voiceschanged', onChange);
  return () => synth.removeEventListener('voiceschanged', onChange);
}

/**
 * `getVoices()` returns a new array on every call, so the snapshot is cached
 * and only replaced when the list of voice URIs actually changed — otherwise
 * `useSyncExternalStore` would see a "new" value on every render and loop.
 */
function getVoicesSnapshot(): readonly SpeechSynthesisVoice[] {
  const synth = getSynth();
  if (!synth) return EMPTY_VOICES;
  const next = synth.getVoices();
  const unchanged =
    next.length === cachedVoices.length &&
    next.every((voice, index) => voice.voiceURI === cachedVoices[index]?.voiceURI);
  if (!unchanged) cachedVoices = next.length === 0 ? EMPTY_VOICES : next;
  return cachedVoices;
}

const getServerVoices = () => EMPTY_VOICES;

/** Errors that are the expected result of `cancel()` or of speaking something new. */
const INTERRUPTIONS = new Set(['canceled', 'interrupted']);

/**
 * Text-to-speech with the Web Speech API (`speechSynthesis`).
 *
 * - Supported in all modern browsers; voices differ per OS and browser.
 * - Voices load asynchronously: `voices` updates on `voiceschanged`.
 * - Chromium only speaks after a user gesture on the page; earlier calls fail
 *   with `error === 'not-allowed'`.
 * - `speechSynthesis` is a single page-wide queue: `cancel()` stops every
 *   utterance, including ones started by other components.
 * - Utterances are kept in a ref while speaking; some Chromium versions
 *   garbage-collect unreferenced utterances and never fire `end`.
 * - Speech started by this hook is cancelled when the component unmounts.
 */
export function useSpeechSynthesis(): SpeechSynthesisControls {
  const isSupported = useBrowserSupport(detect);
  const voices = useSyncExternalStore(subscribeVoices, getVoicesSnapshot, getServerVoices);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(new Set<SpeechSynthesisUtterance>());

  const speak = useCallback((text: string, options: SpeakOptions = {}): boolean => {
    const synth = getSynth();
    if (!synth || !detect() || text.trim() === '') return false;
    const { voice, lang, rate, pitch, volume, queue = false } = options;

    if (!queue) synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    const language = lang ?? voice?.lang;
    if (language) utterance.lang = language;
    if (rate !== undefined) utterance.rate = rate;
    if (pitch !== undefined) utterance.pitch = pitch;
    if (volume !== undefined) utterance.volume = volume;

    const active = activeRef.current;
    const finish = () => {
      active.delete(utterance);
      if (active.size === 0) {
        setSpeaking(false);
        setPaused(false);
      }
    };
    utterance.onstart = () => {
      setSpeaking(true);
      setPaused(false);
    };
    utterance.onend = finish;
    utterance.onerror = (event) => {
      if (!INTERRUPTIONS.has(event.error)) setError(event.error);
      finish();
    };
    utterance.onpause = () => setPaused(true);
    utterance.onresume = () => setPaused(false);

    active.add(utterance);
    setError(null);
    synth.speak(utterance);
    return true;
  }, []);

  const cancel = useCallback(() => {
    const synth = getSynth();
    if (!synth) return;
    synth.cancel();
    // Not every engine fires `end` for queued utterances; settle state here.
    activeRef.current.clear();
    setSpeaking(false);
    setPaused(false);
  }, []);

  const pause = useCallback(() => {
    const synth = getSynth();
    if (!synth || activeRef.current.size === 0) return;
    synth.pause();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    const synth = getSynth();
    if (!synth) return;
    synth.resume();
    setPaused(false);
  }, []);

  useEffect(() => {
    const active = activeRef.current;
    return () => {
      if (active.size > 0) getSynth()?.cancel();
      active.clear();
    };
  }, []);

  return { isSupported, voices, speaking, paused, error, speak, cancel, pause, resume };
}
