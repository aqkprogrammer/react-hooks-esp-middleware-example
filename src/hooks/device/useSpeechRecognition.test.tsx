import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSpeechRecognition, type SpeechRecognitionLike } from './useSpeechRecognition';

class FakeRecognition extends EventTarget implements SpeechRecognitionLike {
  static instances: FakeRecognition[] = [];
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  start = vi.fn(() => {
    if (FakeRecognition.failNextStart) {
      FakeRecognition.failNextStart = false;
      throw new Error('recognition has already started');
    }
  });
  stop = vi.fn();
  abort = vi.fn();
  static failNextStart = false;

  constructor() {
    super();
    FakeRecognition.instances.push(this);
  }

  emit(type: string, props: Record<string, unknown> = {}) {
    act(() => {
      this.dispatchEvent(Object.assign(new Event(type), props));
    });
  }

  /** `chunks`: [transcript, isFinal] for results[resultIndex..]. */
  emitResults(resultIndex: number, chunks: Array<[string, boolean]>) {
    const results: unknown[] = [];
    chunks.forEach(([transcript, isFinal], offset) => {
      results[resultIndex + offset] = Object.assign([{ transcript, confidence: 0.9 }], {
        isFinal,
      });
    });
    this.emit('result', {
      resultIndex,
      results: Object.assign(results, { length: results.length }),
    });
  }
}

const latest = () => {
  const instance = FakeRecognition.instances.at(-1);
  if (!instance) throw new Error('no recognition instance');
  return instance;
};

beforeEach(() => {
  FakeRecognition.instances = [];
  FakeRecognition.failNextStart = false;
});

describe('useSpeechRecognition', () => {
  it('is unsupported (Firefox) and start() is a no-op', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(false);
    act(() => result.current.start());
    expect(result.current.status).toBe('idle');
  });

  it('detects the webkit-prefixed constructor and never starts on mount', () => {
    vi.stubGlobal('webkitSpeechRecognition', FakeRecognition);
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(true);
    expect(FakeRecognition.instances).toHaveLength(0);
  });

  it('configures and starts a session, then streams interim and final results', () => {
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
    const onResult = vi.fn();
    const { result } = renderHook(() =>
      useSpeechRecognition({ lang: 'en-GB', continuous: true, onResult }),
    );

    act(() => result.current.start());
    const recognition = latest();
    expect(recognition.start).toHaveBeenCalledTimes(1);
    expect(recognition).toMatchObject({ lang: 'en-GB', continuous: true, interimResults: true });
    expect(result.current.status).toBe('starting');

    recognition.emit('start');
    expect(result.current.listening).toBe(true);

    recognition.emitResults(0, [['hello wor', false]]);
    expect(result.current.interimTranscript).toBe('hello wor');
    expect(result.current.transcript).toBe('');

    recognition.emitResults(0, [['hello world', true]]);
    recognition.emitResults(1, [[' how are you', true]]);
    expect(result.current.transcript).toBe('hello world how are you');
    expect(result.current.interimTranscript).toBe('');
    expect(onResult).toHaveBeenCalledWith({
      transcript: 'hello world',
      confidence: 0.9,
      isFinal: true,
    });

    act(() => result.current.stop());
    expect(recognition.stop).toHaveBeenCalled();
    expect(result.current.status).toBe('stopping');
    recognition.emit('end');
    expect(result.current.status).toBe('idle');

    act(() => result.current.reset());
    expect(result.current.transcript).toBe('');
  });

  it('surfaces a denied microphone permission as not-allowed', () => {
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    latest().emit('error', { error: 'not-allowed', message: '' });
    latest().emit('end');
    expect(result.current.error).toEqual({ code: 'not-allowed', message: 'not-allowed' });
    expect(result.current.status).toBe('idle');
  });

  it('treats abort() as a normal stop, not an error', () => {
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const recognition = latest();
    act(() => result.current.abort());
    expect(recognition.abort).toHaveBeenCalled();
    recognition.emit('error', { error: 'aborted', message: '' });
    recognition.emit('end');
    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('ignores a second start() while a session is active', () => {
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    act(() => result.current.start());
    expect(FakeRecognition.instances).toHaveLength(1);
  });

  it('reports a start() that throws', () => {
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
    FakeRecognition.failNextStart = true;
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    expect(result.current.error?.code).toBe('start-failed');
    expect(result.current.status).toBe('idle');
    // A fresh session can be started afterwards.
    act(() => result.current.start());
    expect(FakeRecognition.instances).toHaveLength(2);
  });

  it('aborts the session and removes listeners on unmount', () => {
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
    const { result, unmount } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const recognition = latest();
    const remove = vi.spyOn(recognition, 'removeEventListener');
    unmount();
    expect(recognition.abort).toHaveBeenCalled();
    expect(remove.mock.calls.map(([type]) => type).sort()).toEqual([
      'end',
      'error',
      'result',
      'start',
    ]);
  });
});
