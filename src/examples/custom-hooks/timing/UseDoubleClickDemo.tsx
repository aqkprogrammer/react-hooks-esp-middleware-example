import { useState } from 'react';
import { Button, Callout, EventLog, Panel, TextField, useEventLog } from '../../../components/ui';
import { useDoubleClick } from '../../../hooks';

const FILES = ['report.pdf', 'photo.jpg', 'notes.txt'];

/**
 * Single click selects, double click opens — and an explicit "Open" button
 * offers the same action without double-clicking.
 */
export default function UseDoubleClickDemo() {
  const [delay, setDelay] = useState(250);
  const [selected, setSelected] = useState<string | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const { entries, log, clear } = useEventLog();

  const open = (file: string) => {
    setSelected(file);
    setOpened(file);
    log(`opened ${file}`, 'success');
  };

  return (
    <div className="stack">
      <Panel title="Files" description="Click to select, double-click to open.">
        <ul className="list" aria-label="Files">
          {FILES.map((file) => (
            <FileRow
              key={file}
              file={file}
              delay={delay}
              selected={selected === file}
              onSelect={() => {
                setSelected(file);
                log(`selected ${file}`);
              }}
              onOpen={() => open(file)}
            />
          ))}
        </ul>
        <div className="row">
          <Button onClick={() => selected && open(selected)} disabled={!selected}>
            Open selected
          </Button>
          <TextField
            label="Double-click window (ms)"
            type="number"
            min={100}
            step={50}
            value={delay}
            onChange={(event) => setDelay(Math.max(100, Number(event.target.value) || 100))}
          />
        </div>
        {opened ? <p>Currently open: {opened}</p> : null}
        <Callout title="Accessibility">
          Double-click is hard for many people and impossible for some. Always provide another way —
          like the &ldquo;Open selected&rdquo; button — and note that single clicks now feel {delay}{' '}
          ms slower.
        </Callout>
        <EventLog entries={entries} onClear={clear} />
      </Panel>
    </div>
  );
}

function FileRow({
  file,
  delay,
  selected,
  onSelect,
  onOpen,
}: {
  file: string;
  delay: number;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  const { onClick } = useDoubleClick<HTMLButtonElement>({
    delay,
    onSingleClick: onSelect,
    onDoubleClick: onOpen,
  });
  return (
    <li className={selected ? 'active' : undefined}>
      <button type="button" className="btn btn-ghost" aria-pressed={selected} onClick={onClick}>
        {file}
      </button>
    </li>
  );
}
