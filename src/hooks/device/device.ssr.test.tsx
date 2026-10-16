// Runs in the "ssr" Vitest project (Node, no DOM): every device hook must
// render its documented server default without touching browser globals.
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { useBattery } from './useBattery';
import { useDevicePixelRatio } from './useDevicePixelRatio';
import { useOrientation } from './useOrientation';
import { usePointerPosition } from './usePointerPosition';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { useVibration } from './useVibration';

function Device() {
  const battery = useBattery();
  const ratio = useDevicePixelRatio();
  const orientation = useOrientation();
  const pointer = usePointerPosition();
  const recognition = useSpeechRecognition();
  const synthesis = useSpeechSynthesis();
  const vibration = useVibration();
  return (
    <p>
      {[
        battery.isSupported,
        battery.loading,
        ratio,
        orientation.source,
        String(orientation.type),
        String(pointer),
        recognition.isSupported,
        recognition.status,
        synthesis.isSupported,
        synthesis.voices.length,
        vibration.isSupported,
      ].join('|')}
    </p>
  );
}

describe('device hooks on the server', () => {
  it('render unsupported/default values without window', () => {
    expect(typeof window).toBe('undefined');
    expect(renderToString(<Device />)).toBe(
      '<p>false|false|1|none|null|null|false|idle|false|0|false</p>',
    );
  });
});
