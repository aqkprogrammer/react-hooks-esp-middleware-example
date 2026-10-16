import { memo, useId, useState, useTransition } from 'react';
import { Badge, Button, Callout, Panel, TextField } from '../../../components/ui';
import { filterRows, makeRows, simulateWork, type Row } from './workload';
import './performance.css';

type Tab = 'about' | 'posts' | 'contact';
const tabs: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: 'about', label: 'About' },
  { id: 'posts', label: 'Posts (slow)' },
  { id: 'contact', label: 'Contact' },
];
const ROWS = makeRows(2000);

/**
 * `useTransition` marks a state update as non-urgent: React renders it in the
 * background, keeps showing the current UI (with `isPending`) and abandons the
 * render if a more urgent update — a click, a keystroke — arrives first.
 */
export default function UseTransitionDemo() {
  return (
    <div className="stack">
      <SlowTabs />
      <FilteredList />
    </div>
  );
}

function SlowTabs() {
  const [tab, setTab] = useState<Tab>('about');
  const [useTransitionForTabs, setUseTransitionForTabs] = useState(true);
  const [msPerPost, setMsPerPost] = useState(1);
  const [isPending, startTransition] = useTransition();
  const slownessId = useId();

  const selectTab = (next: Tab) => {
    if (useTransitionForTabs) {
      startTransition(() => setTab(next));
    } else {
      setTab(next);
    }
  };

  return (
    <Panel
      title="Tabs with a slow panel"
      description="Click “Posts (slow)” and then immediately “Contact”. With a transition the click is not blocked: React drops the unfinished Posts render."
    >
      <div className="row">
        <label className="row small">
          <input
            type="checkbox"
            checked={useTransitionForTabs}
            onChange={(event) => setUseTransitionForTabs(event.target.checked)}
          />
          Switch tabs inside startTransition
        </label>
        <div className="row small">
          <label htmlFor={slownessId}>Render cost per post</label>
          <select
            id={slownessId}
            value={msPerPost}
            onChange={(event) => setMsPerPost(Number(event.target.value))}
          >
            <option value={0}>0 ms</option>
            <option value={0.5}>0.5 ms</option>
            <option value={1}>1 ms</option>
            <option value={2}>2 ms</option>
          </select>
        </div>
      </div>
      <div className="row" role="group" aria-label="Sections">
        {tabs.map((item) => (
          <Button
            key={item.id}
            variant={tab === item.id ? 'primary' : 'secondary'}
            aria-pressed={tab === item.id}
            onClick={() => selectTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
        <span role="status" className="small">
          {isPending ? <Badge tone="warn">Rendering in the background…</Badge> : null}
        </span>
      </div>
      <div className={isPending ? 'perf-stale' : undefined} aria-busy={isPending}>
        {tab === 'about' ? <p>Welcome! Each post in the next tab is artificially slow.</p> : null}
        {tab === 'posts' ? <SlowPosts msPerPost={msPerPost} /> : null}
        {tab === 'contact' ? <p>Contact us at team@example.invalid.</p> : null}
      </div>
    </Panel>
  );
}

function SlowPosts({ msPerPost }: { msPerPost: number }) {
  const posts = Array.from({ length: 200 }, (_, index) => index + 1);
  return (
    <ul className="list" aria-label="Posts">
      {posts.map((id) => (
        <SlowPost key={id} id={id} msPerPost={msPerPost} />
      ))}
    </ul>
  );
}

function SlowPost({ id, msPerPost }: { id: number; msPerPost: number }) {
  simulateWork(msPerPost);
  return <li>Post #{id}</li>;
}

function FilteredList() {
  const [query, setQuery] = useState('');
  const [listQuery, setListQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  return (
    <Panel
      title="Large filtered list"
      description="The input updates urgently; the 2,000-row list is re-rendered in a transition, so typing never waits for it."
    >
      <TextField
        label="Filter people"
        value={query}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next); // urgent: the input must reflect every keystroke
          startTransition(() => setListQuery(next)); // can lag behind and be interrupted
        }}
      />
      <p role="status" className="small">
        {isPending ? (
          <Badge tone="warn">Updating list…</Badge>
        ) : (
          <Badge tone="success">Up to date</Badge>
        )}
      </p>
      <div className={isPending ? 'perf-stale' : undefined}>
        <ResultList query={listQuery} />
      </div>
      <Callout title="React 19: async functions">
        Since React 19, <code>startTransition</code> also accepts an async function and keeps{' '}
        <code>isPending</code> true until it settles — see the <em>Async transitions (Actions)</em>{' '}
        page.
      </Callout>
    </Panel>
  );
}

const ResultList = memo(function ResultList({ query }: { query: string }) {
  const rows = filterRows(ROWS, query);
  return (
    <>
      <p className="small muted">{rows.length} people match</p>
      <ul className="list" aria-label="People">
        {rows.map((row) => (
          <ResultRow key={row.id} row={row} />
        ))}
      </ul>
    </>
  );
});

function ResultRow({ row }: { row: Row }) {
  simulateWork(0.05);
  return (
    <li>
      {row.name} <span className="muted small">{row.team}</span>
    </li>
  );
}
