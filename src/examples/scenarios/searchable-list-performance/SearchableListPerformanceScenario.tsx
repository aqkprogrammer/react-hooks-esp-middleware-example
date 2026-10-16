import { Callout, Panel } from '../../../components/ui';
import { SearchBench } from './SearchBench';
import './SearchableListPerformanceScenario.css';

/**
 * 10,000 searchable rows rendered four ways, with numbers measured live by
 * `<Profiler>` and `performance.now()`.
 */
export default function SearchableListPerformanceScenario() {
  return (
    <div className="stack">
      <Panel
        title="Search 10,000 items"
        description="Pick a strategy, type quickly, and compare the measured timings below."
      >
        <SearchBench itemCount={10_000} />
      </Panel>
      <Callout title="Reading the numbers">
        <strong>Keystroke → list committed</strong> is the time from the change event until the list
        for that query is in the DOM. <strong>Commit containing the keystroke</strong> is how long
        React was busy before the typed character could appear: in the naive strategy it includes
        the whole list, while <code>useDeferredValue</code>/<code>useTransition</code> commit the
        input first and render the list in an interruptible background pass. Windowing cuts the work
        itself, by rendering only the rows you can see. Numbers vary by device and are higher in
        development builds.
      </Callout>
      <Callout tone="info" title="Production: use a virtualization library">
        The window here assumes a fixed row height and a vertical list. Libraries such as TanStack
        Virtual or react-window also handle variable and measured heights, horizontal and grid
        layouts, scroll anchoring, sticky rows and scrolling to an index.
      </Callout>
    </div>
  );
}
