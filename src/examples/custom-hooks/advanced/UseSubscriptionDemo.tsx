import { Button, Panel, RenderCount, ValueTable } from '../../../components/ui';
import { useSubscription, type SubscriptionSource } from '../../../hooks/advanced';

/** A browser source: the current text selection (`selectionchange` event). */
const selectionSource: SubscriptionSource<string> = {
  subscribe: (onChange) => {
    document.addEventListener('selectionchange', onChange);
    return () => document.removeEventListener('selectionchange', onChange);
  },
  getCurrentValue: () => document.getSelection()?.toString() ?? '',
  getServerValue: () => '',
};

/**
 * A plain-JavaScript source that knows nothing about React. Its
 * `getCurrentValue` returns a *new object* every call, so the hook needs
 * `isEqual` to avoid an infinite render loop.
 */
class Thermostat {
  private celsius = 21;
  private listeners = new Set<() => void>();
  subscribe(onChange: () => void) {
    this.listeners.add(onChange);
    return () => {
      this.listeners.delete(onChange);
    };
  }
  getCurrentValue() {
    return { celsius: this.celsius, fahrenheit: Math.round((this.celsius * 9) / 5 + 32) };
  }
  adjust(delta: number) {
    this.celsius += delta;
    this.listeners.forEach((listener) => listener());
  }
  /** Notifies without changing anything — the UI must not re-render. */
  ping() {
    this.listeners.forEach((listener) => listener());
  }
}
const thermostat = new Thermostat();
const sameReading = (a: { celsius: number }, b: { celsius: number }) => a.celsius === b.celsius;

function SelectionReadout() {
  const selection = useSubscription(selectionSource);
  return (
    <ValueTable
      label="Selection"
      rows={{
        'Selected text': selection ? `“${selection}”` : 'select some text on this page',
        Characters: selection.length,
      }}
    />
  );
}

function ThermostatReadout() {
  const reading = useSubscription(thermostat, { isEqual: sameReading });
  return (
    <ValueTable
      label="Thermostat"
      rows={{ Celsius: `${reading.celsius} °C`, Fahrenheit: `${reading.fahrenheit} °F` }}
    />
  );
}

export default function UseSubscriptionDemo() {
  return (
    <div className="stack">
      <Panel title="Browser source: text selection">
        <SelectionReadout />
      </Panel>
      <Panel
        title="Class-based source with fresh objects"
        description="“Notify without a change” fires the listener, but isEqual keeps the old snapshot, so the readout does not re-render."
      >
        <RenderCount label="Readout">
          <ThermostatReadout />
        </RenderCount>
        <div className="row">
          <Button onClick={() => thermostat.adjust(-1)}>Colder</Button>
          <Button onClick={() => thermostat.adjust(1)}>Warmer</Button>
          <Button variant="ghost" onClick={() => thermostat.ping()}>
            Notify without a change
          </Button>
        </div>
      </Panel>
    </div>
  );
}
