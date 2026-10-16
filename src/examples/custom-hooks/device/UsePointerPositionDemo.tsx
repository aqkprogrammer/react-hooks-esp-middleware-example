import { useRef, useState } from 'react';
import { Button, Panel, ValueTable } from '../../../components/ui';
import { usePointerPosition } from '../../../hooks/device';
import './UsePointerPositionDemo.css';

export default function UsePointerPositionDemo() {
  const [enabled, setEnabled] = useState(true);
  const areaRef = useRef<HTMLDivElement>(null);
  const windowPosition = usePointerPosition({ enabled });
  const local = usePointerPosition({ target: areaRef, enabled });

  return (
    <div className="stack">
      <Panel
        title="Window"
        description="Updates are throttled to one per animation frame, however fast pointermove fires."
      >
        <ValueTable
          label="Window pointer"
          rows={{
            'Client X / Y': windowPosition
              ? `${Math.round(windowPosition.clientX)} / ${Math.round(windowPosition.clientY)}`
              : 'move the pointer',
            'Pointer type': windowPosition?.pointerType || '—',
          }}
        />
        <Button onClick={() => setEnabled((value) => !value)} aria-pressed={!enabled}>
          {enabled ? 'Pause tracking' : 'Resume tracking'}
        </Button>
      </Panel>
      <Panel
        title="Relative to an element"
        description="Coordinates are measured from the box's top-left corner and reset when the pointer leaves."
      >
        <div
          ref={areaRef}
          className="demo-surface use-pointer-position-area"
          aria-label="Pointer tracking area"
        >
          {local ? (
            <>
              <span
                className="use-pointer-position-line-x"
                style={{ top: `${local.ratioY * 100}%` }}
                aria-hidden="true"
              />
              <span
                className="use-pointer-position-line-y"
                style={{ left: `${local.ratioX * 100}%` }}
                aria-hidden="true"
              />
              <span
                className="use-pointer-position-dot"
                style={{ left: `${local.ratioX * 100}%`, top: `${local.ratioY * 100}%` }}
                aria-hidden="true"
              />
            </>
          ) : (
            <span>Move your pointer (or finger) here</span>
          )}
        </div>
        <ValueTable
          label="Element pointer"
          rows={{
            'X / Y (px)': local ? `${Math.round(local.x)} / ${Math.round(local.y)}` : 'outside',
            'X / Y (%)': local
              ? `${Math.round(local.ratioX * 100)}% / ${Math.round(local.ratioY * 100)}%`
              : 'outside',
          }}
        />
      </Panel>
    </div>
  );
}
