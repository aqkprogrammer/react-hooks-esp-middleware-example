import { useState } from 'react';
import { Callout, Panel, RenderCount, TextField } from '../../../components/ui';

const cities = ['Amsterdam', 'Berlin', 'Lisbon', 'London', 'Madrid', 'Paris', 'Rome', 'Vienna'];

/**
 * State colocation: keep state in the lowest component that needs it.
 * When the filter text lives in the page component, every keystroke
 * re-renders the unrelated sibling too.
 */
export default function UseStateColocationDemo() {
  return (
    <div className="stack">
      <div className="grid">
        <Panel title="State lifted too high" description="The page owns the filter text.">
          <LiftedPage />
        </Panel>
        <Panel title="State colocated" description="The filter owns its own text.">
          <ColocatedPage />
        </Panel>
      </div>
      <Callout title="Lift state only as far as needed">
        Lift state to the closest common parent of the components that read it — no further.
        Colocating is free and usually beats reaching for <code>memo</code>.
      </Callout>
    </div>
  );
}

function LiftedPage() {
  const [query, setQuery] = useState('');
  return (
    <div className="stack">
      <CityFilter label="Lifted filter" query={query} onQueryChange={setQuery} />
      <RenderCount label="Lifted sibling">
        <Sidebar />
      </RenderCount>
    </div>
  );
}

function ColocatedPage() {
  return (
    <div className="stack">
      <ColocatedCityFilter />
      <RenderCount label="Colocated sibling">
        <Sidebar />
      </RenderCount>
    </div>
  );
}

function ColocatedCityFilter() {
  const [query, setQuery] = useState('');
  return <CityFilter label="Colocated filter" query={query} onQueryChange={setQuery} />;
}

interface CityFilterProps {
  label: string;
  query: string;
  onQueryChange: (query: string) => void;
}

function CityFilter({ label, query, onQueryChange }: CityFilterProps) {
  const visible = cities.filter((city) => city.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="stack">
      <TextField
        label={label}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <p className="small muted" aria-live="polite">
        {visible.length ? visible.join(', ') : 'No matches'}
      </p>
    </div>
  );
}

/** Stands in for an unrelated, possibly expensive part of the page. */
function Sidebar() {
  return <p className="small muted">An unrelated sidebar. It does not use the filter text.</p>;
}
