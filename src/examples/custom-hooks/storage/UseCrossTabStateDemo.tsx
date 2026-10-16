import { Button, Callout, Panel, ValueTable } from '../../../components/ui';
import { useCrossTabState, useLocalStorage } from '../../../hooks';

const SLIDES = ['Welcome', 'Agenda', 'Architecture', 'Demo', 'Questions'] as const;

const isSlide = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < SLIDES.length;

/**
 * A "presenter" slide index shared live between tabs — compared side by side
 * with a localStorage-backed counter to show the difference in persistence.
 */
export default function UseCrossTabStateDemo() {
  const [slide, setSlide] = useCrossTabState('playground:slide', 0, { validate: isSlide });
  const [persisted, setPersisted] = useLocalStorage('playground:slide-persisted', 0, {
    validate: isSlide,
  });

  return (
    <div className="stack">
      <Panel
        title={`Live slide: ${slide + 1}. ${SLIDES[slide] ?? ''}`}
        description="Open this page in two tabs and move between slides in either one."
      >
        <div className="row">
          <Button onClick={() => setSlide((s) => Math.max(0, s - 1))} disabled={slide === 0}>
            Previous slide
          </Button>
          <Button
            variant="primary"
            onClick={() => setSlide((s) => Math.min(SLIDES.length - 1, s + 1))}
            disabled={slide === SLIDES.length - 1}
          >
            Next slide
          </Button>
        </div>
      </Panel>
      <Panel title="For comparison: useLocalStorage">
        <ValueTable
          label="Comparison"
          rows={{
            'useCrossTabState (memory only)': slide + 1,
            'useLocalStorage (on disk)': persisted + 1,
          }}
        />
        <div className="row">
          <Button onClick={() => setPersisted((s) => (s + 1) % SLIDES.length)}>
            Advance persisted slide
          </Button>
        </div>
      </Panel>
      <Callout title="Try this">
        With one tab open, reload: the live slide resets to 1 (nothing was stored) while the
        persisted one survives. With two tabs open, reload one: it asks the other tab for the
        current slide and catches up.
      </Callout>
    </div>
  );
}
