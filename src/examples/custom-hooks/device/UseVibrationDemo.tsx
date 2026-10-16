import { useState } from 'react';
import { Badge, Button, Callout, Panel, TextField, ValueTable } from '../../../components/ui';
import { useVibration } from '../../../hooks/device';

/** "SOS" in Morse code: · · · — — — · · · */
const SOS = [100, 60, 100, 60, 100, 200, 300, 60, 300, 60, 300, 200, 100, 60, 100, 60, 100];

function parsePattern(text: string): number[] | null {
  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const numbers = parts.map(Number);
  return numbers.every((value) => Number.isInteger(value) && value >= 0 && value <= 10_000)
    ? numbers
    : null;
}

export default function UseVibrationDemo() {
  const { isSupported, isVibrating, vibrate, cancel } = useVibration();
  const [patternText, setPatternText] = useState('200, 100, 200');
  const [lastResult, setLastResult] = useState<string>('—');
  const pattern = parsePattern(patternText);

  const run = (label: string, value: number | number[]) => {
    const accepted = vibrate(value);
    setLastResult(accepted ? `${label}: accepted` : `${label}: rejected by the browser`);
  };

  return (
    <div className="stack">
      {isSupported ? (
        <Callout title="Needs a user gesture and a motor">
          Chromium ignores <code>vibrate()</code> until you have interacted with the page, and
          laptops/desktops usually have no vibration hardware — the call then succeeds silently. Try
          this on an Android phone.
        </Callout>
      ) : (
        <Callout tone="warn" title="Not supported in this browser">
          <code>navigator.vibrate</code> is missing. Safari on iOS and macOS has never supported the
          Vibration API, so haptics must stay an optional enhancement.
        </Callout>
      )}
      <Panel title="Patterns">
        <div className="row">
          <Button variant="primary" disabled={!isSupported} onClick={() => run('Buzz', 200)}>
            Short buzz (200 ms)
          </Button>
          <Button disabled={!isSupported} onClick={() => run('SOS', SOS)}>
            SOS pattern
          </Button>
          <Button variant="danger" disabled={!isSupported} onClick={cancel}>
            Cancel
          </Button>
        </div>
        <TextField
          label="Custom pattern (ms, comma-separated: vibrate, pause, vibrate…)"
          value={patternText}
          onChange={(event) => setPatternText(event.target.value)}
          error={pattern ? undefined : 'Use whole numbers between 0 and 10000, e.g. 200, 100, 200'}
        />
        <Button
          disabled={!isSupported || !pattern}
          onClick={() => pattern && run('Custom', pattern)}
        >
          Play custom pattern
        </Button>
        <ValueTable
          label="Vibration state"
          rows={{
            Supported: String(isSupported),
            Vibrating: (
              <Badge tone={isVibrating ? 'success' : 'neutral'}>{String(isVibrating)}</Badge>
            ),
            'Last call': lastResult,
          }}
        />
      </Panel>
    </div>
  );
}
