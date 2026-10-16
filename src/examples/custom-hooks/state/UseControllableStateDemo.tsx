import { useState } from 'react';
import { Button, EventLog, Panel, ValueTable, useEventLog } from '../../../components/ui';
import { useControllableState } from '../../../hooks';

interface RatingProps {
  label: string;
  /** Controlled value. */
  value?: number;
  /** Initial value when uncontrolled. */
  defaultValue?: number;
  onValueChange?: (value: number) => void;
}

/** A reusable component that supports both controlled and uncontrolled usage. */
function Rating({ label, value, defaultValue = 0, onValueChange }: RatingProps) {
  const [rating, setRating] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
    name: 'Rating',
  });
  return (
    <div className="stack">
      <div className="row" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Button
            key={star}
            size="sm"
            aria-pressed={star <= rating}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            variant={star <= rating ? 'primary' : 'secondary'}
            onClick={() => setRating(star)}
          >
            ★
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => setRating((r) => Math.max(0, r - 1))}>
          −1
        </Button>
      </div>
      <span className="small muted">
        {label}: {rating} / 5
      </span>
    </div>
  );
}

export default function UseControllableStateDemo() {
  const [controlled, setControlled] = useState(3);
  const [onlyOdd, setOnlyOdd] = useState(false);
  const { entries, log, clear } = useEventLog();

  return (
    <div className="stack">
      <Panel
        title="Uncontrolled"
        description="<Rating defaultValue={2} /> keeps its own state; onValueChange still fires."
      >
        <Rating
          label="Uncontrolled rating"
          defaultValue={2}
          onValueChange={(value) => log(`uncontrolled → ${value}`)}
        />
      </Panel>
      <Panel
        title="Controlled"
        description="<Rating value={rating} onValueChange={…} /> — the parent owns (and may reject) the value."
      >
        <Rating
          label="Controlled rating"
          value={controlled}
          onValueChange={(value) => {
            if (onlyOdd && value % 2 === 0) {
              log(`controlled: parent rejected ${value}`, 'warn');
              return;
            }
            log(`controlled → ${value}`, 'success');
            setControlled(value);
          }}
        />
        <label className="row">
          <input type="checkbox" checked={onlyOdd} onChange={(e) => setOnlyOdd(e.target.checked)} />
          Parent only accepts odd ratings
        </label>
        <div className="row">
          <Button onClick={() => setControlled(5)}>Parent sets 5</Button>
        </div>
        <ValueTable label="Parent state" rows={{ 'parent rating': controlled }} />
      </Panel>
      <EventLog entries={entries} onClear={clear} title="onValueChange calls" />
    </div>
  );
}
