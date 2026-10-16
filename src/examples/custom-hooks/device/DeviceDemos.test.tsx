import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installMatchMedia, overrideProperty } from '../../../test/browserMocks';
import UseBatteryDemo from './UseBatteryDemo';
import UseDevicePixelRatioDemo from './UseDevicePixelRatioDemo';
import UseOrientationDemo from './UseOrientationDemo';
import UsePointerPositionDemo from './UsePointerPositionDemo';
import UseSpeechRecognitionDemo from './UseSpeechRecognitionDemo';
import UseSpeechSynthesisDemo from './UseSpeechSynthesisDemo';
import UseVibrationDemo from './UseVibrationDemo';

const restores: Array<() => void> = [];
afterEach(() => {
  while (restores.length) restores.pop()?.();
  vi.useRealTimers();
});
const override = (target: object, key: PropertyKey, value: unknown) =>
  restores.push(overrideProperty(target, key, value));

describe('UseOrientationDemo', () => {
  it('shows an unsupported panel without any orientation API', () => {
    render(<UseOrientationDemo />);
    expect(screen.getByText('Not supported in this browser')).toBeInTheDocument();
  });

  it('shows the media-query fallback', () => {
    installMatchMedia({ '(orientation: portrait)': false });
    render(<UseOrientationDemo />);
    expect(screen.getByText('landscape-primary')).toBeInTheDocument();
    expect(screen.getByText('not available')).toBeInTheDocument();
  });
});

describe('UseVibrationDemo', () => {
  it('disables the controls and explains why when unsupported', () => {
    render(<UseVibrationDemo />);
    expect(screen.getByText('Not supported in this browser')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Short buzz (200 ms)' })).toBeDisabled();
  });

  it('plays patterns and validates the custom pattern', async () => {
    const vibrate = vi.fn(() => true);
    override(navigator, 'vibrate', vibrate);
    const user = userEvent.setup();
    render(<UseVibrationDemo />);

    await user.click(screen.getByRole('button', { name: 'Short buzz (200 ms)' }));
    expect(vibrate).toHaveBeenCalledWith(200);
    expect(screen.getByText('Buzz: accepted')).toBeInTheDocument();

    const input = screen.getByLabelText(/Custom pattern/);
    await user.clear(input);
    await user.type(input, '50, x');
    expect(screen.getByRole('button', { name: 'Play custom pattern' })).toBeDisabled();
    await user.clear(input);
    await user.type(input, '50, 25, 50');
    await user.click(screen.getByRole('button', { name: 'Play custom pattern' }));
    expect(vibrate).toHaveBeenLastCalledWith([50, 25, 50]);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(vibrate).toHaveBeenLastCalledWith(0);
  });
});

describe('UseBatteryDemo', () => {
  it('shows the compatibility notice when unsupported', () => {
    render(<UseBatteryDemo />);
    expect(screen.getByText('Not supported in this browser')).toBeInTheDocument();
    expect(screen.getByText('Privacy & compatibility')).toBeInTheDocument();
  });

  it('shows the level and charging state', async () => {
    const battery = Object.assign(new EventTarget(), {
      charging: false,
      chargingTime: Infinity,
      dischargingTime: 5400,
      level: 0.15,
    });
    override(navigator, 'getBattery', () => Promise.resolve(battery));
    render(<UseBatteryDemo />);
    expect(await screen.findByText('Level: 15%')).toBeInTheDocument();
    expect(screen.getByText('on battery')).toBeInTheDocument();
    expect(screen.getByText('1 h 30 min')).toBeInTheDocument();
    expect(screen.getByText('yes')).toBeInTheDocument();
  });
});

describe('UsePointerPositionDemo', () => {
  it('tracks the pointer inside the area and can be paused', () => {
    vi.useFakeTimers();
    render(<UsePointerPositionDemo />);
    const area = screen.getByLabelText('Pointer tracking area');
    vi.spyOn(area, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 200, height: 100 }),
    );
    fireEvent.pointerMove(area, { clientX: 50, clientY: 50 });
    act(() => vi.advanceTimersByTime(16));
    const element = screen.getByLabelText('Element pointer');
    expect(within(element).getByText('50 / 50')).toBeInTheDocument();
    expect(within(element).getByText('25% / 50%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pause tracking' }));
    expect(screen.getByRole('button', { name: 'Resume tracking' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('UseDevicePixelRatioDemo', () => {
  it('shows the ratio and sizes the canvas backing store for it', () => {
    override(window, 'devicePixelRatio', 2);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<UseDevicePixelRatioDemo />);
    expect(within(screen.getByLabelText('Device pixel ratio')).getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Canvas rendered at 2× pixel density' })).toBeVisible();
    expect(screen.getByText('(resolution: 2dppx)')).toBeInTheDocument();
  });
});

describe('UseSpeechRecognitionDemo', () => {
  it('offers a typed fallback when unsupported', async () => {
    const user = userEvent.setup();
    render(<UseSpeechRecognitionDemo />);
    expect(screen.getByText('Not supported in this browser')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Type instead'), 'hello');
    expect(screen.getByLabelText('Type instead')).toHaveValue('hello');
  });

  it('starts only on click and explains a denied microphone', async () => {
    const instances: Array<EventTarget & { start: () => void }> = [];
    class FakeRecognition extends EventTarget {
      lang = '';
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      start = vi.fn();
      stop = vi.fn();
      abort = vi.fn();
      constructor() {
        super();
        instances.push(this);
      }
    }
    vi.stubGlobal('webkitSpeechRecognition', FakeRecognition);
    const user = userEvent.setup();
    render(<UseSpeechRecognitionDemo />);
    expect(instances).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Start' }));
    const recognition = instances[0];
    expect(recognition?.start).toHaveBeenCalled();
    act(() => {
      recognition?.dispatchEvent(
        Object.assign(new Event('error'), { error: 'not-allowed', message: '' }),
      );
      recognition?.dispatchEvent(new Event('end'));
    });
    expect(screen.getByText('Error: not-allowed')).toBeInTheDocument();
    expect(screen.getByText(/Microphone access was denied/)).toBeInTheDocument();
  });
});

describe('UseSpeechSynthesisDemo', () => {
  it('shows an unsupported panel', () => {
    render(<UseSpeechSynthesisDemo />);
    expect(screen.getByText('Not supported in this browser')).toBeInTheDocument();
  });

  it('speaks the text with the chosen rate', async () => {
    const speak = vi.fn();
    const synth = Object.assign(new EventTarget(), {
      getVoices: () => [],
      speak,
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
    });
    class Utterance {
      rate = 1;
      pitch = 1;
      constructor(public text: string) {}
    }
    vi.stubGlobal('speechSynthesis', synth);
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    const user = userEvent.setup();
    render(<UseSpeechSynthesisDemo />);
    expect(screen.getByText('Voices are still loading…')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Rate/), { target: { value: '1.5' } });
    await user.click(screen.getByRole('button', { name: 'Speak' }));
    await waitFor(() => expect(speak).toHaveBeenCalled());
    expect(speak.mock.calls[0]?.[0]).toMatchObject({ rate: 1.5 });
  });
});
