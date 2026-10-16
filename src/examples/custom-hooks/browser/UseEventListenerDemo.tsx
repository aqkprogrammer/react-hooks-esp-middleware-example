import { useRef, useState } from 'react';
import { Button, EventLog, Panel, ValueTable, useEventLog } from '../../../components/ui';
import { useEventListener } from '../../../hooks';

export default function UseEventListenerDemo() {
  const [enabled, setEnabled] = useState(true);
  const [lastKey, setLastKey] = useState('—');
  const [size, setSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const { entries, log, clear } = useEventLog();
  const boxRef = useRef<HTMLDivElement>(null);

  // Window (default target). Passing `null` disables the listener entirely.
  useEventListener('keydown', (event) => setLastKey(event.key), enabled ? undefined : null);
  useEventListener('resize', () =>
    setSize({ width: window.innerWidth, height: window.innerHeight }),
  );

  // Element ref target: the inline handler changes every render, but the hook
  // keeps one subscription and always calls the latest handler.
  useEventListener(
    'pointermove',
    (event) => log(`pointermove at ${Math.round(event.offsetX)}, ${Math.round(event.offsetY)}`),
    boxRef,
    { passive: true },
  );

  return (
    <div className="stack">
      <Panel title="Window listeners">
        <ValueTable
          rows={{
            'Last key pressed': <kbd className="kbd">{lastKey}</kbd>,
            'Window size': `${size.width} × ${size.height}`,
            'Keyboard listener': enabled ? 'attached' : 'removed',
          }}
        />
        <Button onClick={() => setEnabled((value) => !value)}>
          {enabled ? 'Detach keyboard listener' : 'Attach keyboard listener'}
        </Button>
      </Panel>
      <Panel title="Element listener (passive pointermove)">
        <div ref={boxRef} className="demo-surface" aria-label="Pointer tracking area">
          Move your pointer here
        </div>
        <EventLog entries={entries} onClear={clear} />
      </Panel>
    </div>
  );
}
