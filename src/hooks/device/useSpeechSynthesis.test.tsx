import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSpeechSynthesis } from './useSpeechSynthesis';

class FakeUtterance {
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  rate = 1;
  pitch = 1;
  volume = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onpause: (() => void) | null = null;
  onresume: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

const voice = (name: string, lang: string) =>
  ({ name, lang, voiceURI: name, default: false, localService: true }) as SpeechSynthesisVoice;

class FakeSynth extends EventTarget {
  voices: SpeechSynthesisVoice[] = [];
  spoken: FakeUtterance[] = [];
  getVoices = vi.fn(() => [...this.voices]);
  speak = vi.fn((utterance: FakeUtterance) => {
    this.spoken.push(utterance);
  });
  cancel = vi.fn();
  pause = vi.fn();
  resume = vi.fn();

  loadVoices(list: SpeechSynthesisVoice[]) {
    this.voices = list;
    act(() => {
      this.dispatchEvent(new Event('voiceschanged'));
    });
  }
}

function install() {
  const synth = new FakeSynth();
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return synth;
}

const lastUtterance = (synth: FakeSynth) => {
  const utterance = synth.spoken.at(-1);
  if (!utterance) throw new Error('nothing spoken');
  return utterance;
};

describe('useSpeechSynthesis', () => {
  it('is unsupported without speechSynthesis', () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    expect(result.current.isSupported).toBe(false);
    expect(result.current.voices).toEqual([]);
    let spoke = true;
    act(() => {
      spoke = result.current.speak('hello');
    });
    expect(spoke).toBe(false);
  });

  it('loads voices asynchronously via voiceschanged and keeps a stable array', () => {
    const synth = install();
    const { result, rerender } = renderHook(() => useSpeechSynthesis());
    expect(result.current.voices).toEqual([]);

    synth.loadVoices([voice('Ada', 'en-GB'), voice('Grace', 'en-US')]);
    expect(result.current.voices.map((item) => item.name)).toEqual(['Ada', 'Grace']);

    const first = result.current.voices;
    rerender();
    expect(result.current.voices).toBe(first);
  });

  it('speaks with options and tracks speaking/paused from utterance events', () => {
    const synth = install();
    const grace = voice('Grace', 'en-US');
    const { result } = renderHook(() => useSpeechSynthesis());

    act(() => {
      result.current.speak('Hello there', { voice: grace, rate: 1.5, pitch: 0.8, volume: 0.5 });
    });
    const utterance = lastUtterance(synth);
    expect(synth.cancel).toHaveBeenCalledTimes(1); // interrupts by default
    expect(utterance).toMatchObject({
      text: 'Hello there',
      voice: grace,
      lang: 'en-US',
      rate: 1.5,
      pitch: 0.8,
      volume: 0.5,
    });

    act(() => utterance.onstart?.());
    expect(result.current.speaking).toBe(true);

    act(() => result.current.pause());
    expect(synth.pause).toHaveBeenCalled();
    expect(result.current.paused).toBe(true);
    act(() => result.current.resume());
    expect(result.current.paused).toBe(false);

    act(() => utterance.onend?.());
    expect(result.current.speaking).toBe(false);
  });

  it('queues instead of interrupting when asked', () => {
    const synth = install();
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => {
      result.current.speak('one', { queue: true });
    });
    expect(synth.cancel).not.toHaveBeenCalled();
  });

  it('ignores blank text', () => {
    const synth = install();
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => {
      expect(result.current.speak('   ')).toBe(false);
    });
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('reports real errors but not interruptions', () => {
    const synth = install();
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => {
      result.current.speak('first');
    });
    act(() => lastUtterance(synth).onerror?.({ error: 'interrupted' }));
    expect(result.current.error).toBeNull();

    act(() => {
      result.current.speak('second');
    });
    act(() => lastUtterance(synth).onerror?.({ error: 'not-allowed' }));
    expect(result.current.error).toBe('not-allowed');
    expect(result.current.speaking).toBe(false);
  });

  it('cancel() settles state immediately', () => {
    const synth = install();
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => {
      result.current.speak('long text');
    });
    act(() => lastUtterance(synth).onstart?.());
    act(() => result.current.cancel());
    expect(synth.cancel).toHaveBeenCalledTimes(2);
    expect(result.current.speaking).toBe(false);
  });

  it('cancels its own speech and removes the voices listener on unmount', () => {
    const synth = install();
    const remove = vi.spyOn(synth, 'removeEventListener');
    const { result, unmount } = renderHook(() => useSpeechSynthesis());
    act(() => {
      result.current.speak('bye');
    });
    synth.cancel.mockClear();
    unmount();
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls.some(([type]) => type === 'voiceschanged')).toBe(true);
  });

  it('does not cancel other speech on unmount when idle', () => {
    const synth = install();
    const { unmount } = renderHook(() => useSpeechSynthesis());
    unmount();
    expect(synth.cancel).not.toHaveBeenCalled();
  });
});
