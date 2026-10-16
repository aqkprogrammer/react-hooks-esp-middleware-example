import { useId, useState } from 'react';
import { Callout, EventLog, Panel, ValueTable, useEventLog } from '../../../components/ui';
import { useHover } from '../../../hooks';

/**
 * A profile card that previews details while hovered. Hover is only an
 * enhancement: the same details open on keyboard focus and on click/tap.
 */
export default function UseHoverDemo() {
  const [ignoreTouch, setIgnoreTouch] = useState(true);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const { entries, log, clear } = useEventLog(20);
  const [ref, isHovered] = useHover<HTMLDivElement>({
    ignoreTouch,
    onChange: (hovered, event) =>
      log(`${hovered ? 'pointerenter' : 'pointerleave'} (${event.pointerType || 'unknown'})`),
  });
  const detailsId = useId();
  const showDetails = isHovered || focused || pinned;

  return (
    <div className="stack">
      <Panel
        title="Hover card"
        description="Hover the card with a mouse or pen. Keyboard: Tab to the name. Touch: tap it."
      >
        <div ref={ref} className="card" data-testid="hover-card">
          <button
            type="button"
            className="btn btn-ghost"
            aria-expanded={showDetails}
            aria-controls={detailsId}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onClick={() => setPinned((value) => !value)}
          >
            Ada Lovelace
          </button>
          <p className="muted small">Mathematician · Analytical Engine</p>
          <p id={detailsId} hidden={!showDetails}>
            Wrote the first published algorithm intended for a machine, in 1843.
          </p>
        </div>
        <label className="row">
          <input
            type="checkbox"
            checked={ignoreTouch}
            onChange={(event) => setIgnoreTouch(event.target.checked)}
          />
          Ignore touch “hover” (taps)
        </label>
        <ValueTable
          rows={{
            isHovered: String(isHovered),
            'Name focused': String(focused),
            'Pinned by click': String(pinned),
            'Details visible': String(showDetails),
          }}
        />
        <EventLog entries={entries} onClear={clear} />
      </Panel>
      <Callout title="Prefer CSS for purely visual hover effects">
        <code>:hover</code> needs no JavaScript and no re-render. Reach for the hook when hover
        changes <em>behaviour</em> — prefetching data, starting a preview, analytics.
      </Callout>
    </div>
  );
}
