import { useState } from 'react';
import { Button, Panel, TextField } from '../../../components/ui';
import { useDebouncedCallback, useThrottledCallback } from '../../../hooks';
import './DebounceVsThrottleDemo.css';

type Lane = 'raw' | 'debounced' | 'throttled';

interface Timeline {
  start: number | null;
  events: Record<Lane, number[]>;
}

const EMPTY: Timeline = { start: null, events: { raw: [], debounced: [], throttled: [] } };
const MAX_EVENTS = 400;

/**
 * The same stream of events feeds a debounced and a throttled callback. The
 * timeline shows when each one actually ran.
 */
export default function DebounceVsThrottleDemo() {
  const [timeline, setTimeline] = useState<Timeline>(EMPTY);
  const [wait, setWait] = useState(250);

  const record = (lane: Lane) => {
    const now = Date.now();
    setTimeline((previous) => ({
      start: previous.start ?? now,
      events: {
        ...previous.events,
        [lane]: [...previous.events[lane], now].slice(-MAX_EVENTS),
      },
    }));
  };

  const debounced = useDebouncedCallback(() => record('debounced'), wait);
  const throttled = useThrottledCallback(() => record('throttled'), wait);

  const onEvent = () => {
    record('raw');
    debounced();
    throttled();
  };

  const { start, events } = timeline;
  const last = Math.max(start ?? 0, ...events.raw, ...events.debounced, ...events.throttled);
  const span = start === null ? 1 : Math.max(last - start + wait, 1000);
  const position = (time: number) => `${(((time - (start ?? time)) / span) * 100).toFixed(2)}%`;

  const lanes: Array<{ lane: Lane; label: string }> = [
    { lane: 'raw', label: 'Raw events' },
    { lane: 'debounced', label: 'Debounced' },
    { lane: 'throttled', label: 'Throttled' },
  ];

  return (
    <div className="stack">
      <Panel
        title="Generate events"
        description="Move the pointer over the area or type in the field — both feed all three lanes."
      >
        <div
          className="demo-surface debounce-vs-throttle-surface"
          onPointerMove={onEvent}
          aria-hidden="true"
        >
          Move your pointer here
        </div>
        <div className="row">
          <TextField label="…or type here" onChange={onEvent} />
          <TextField
            label="Wait / interval (ms)"
            type="number"
            min={50}
            step={50}
            value={wait}
            onChange={(event) => setWait(Math.max(50, Number(event.target.value) || 50))}
          />
          <Button
            variant="ghost"
            onClick={() => {
              debounced.cancel();
              throttled.cancel();
              setTimeline(EMPTY);
            }}
          >
            Clear timeline
          </Button>
        </div>
      </Panel>
      <Panel title="Timeline">
        <div className="stack" role="group" aria-label="Timeline">
          {lanes.map(({ lane, label }) => (
            <div key={lane} className="debounce-vs-throttle-row">
              <span className="small">{label}</span>
              <div className="debounce-vs-throttle-track" aria-hidden="true">
                {events[lane].map((time, index) => (
                  <span
                    key={index}
                    className={`debounce-vs-throttle-tick debounce-vs-throttle-${lane}`}
                    style={{ left: position(time) }}
                  />
                ))}
              </div>
              <output className="mono small" aria-label={`${label} count`}>
                {events[lane].length}
              </output>
            </div>
          ))}
        </div>
        <p className="small muted">
          Debounce runs once after the burst ends; throttle runs immediately and then at most once
          per interval while events keep coming.
        </p>
      </Panel>
    </div>
  );
}
