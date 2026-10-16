import { useId, useState } from 'react';
import { Badge, Callout, Panel } from '../../components/ui';
import {
  compareSlots,
  hookCalls,
  scenarios,
  verdict,
  type ScenarioId,
  type SlotStatus,
  type Variant,
} from './hookSlots';
import './antiPatterns.css';

const statusLabel: Record<SlotStatus, { text: string; tone: 'success' | 'warn' | 'neutral' }> = {
  ok: { text: 'OK', tone: 'success' },
  'wrong-state': { text: 'Wrong state', tone: 'warn' },
  'order-changed': { text: 'Order changed', tone: 'warn' },
  missing: { text: 'Never reached', tone: 'neutral' },
  extra: { text: 'No slot', tone: 'neutral' },
};

/**
 * A visual simulation (no real Hooks are misused): the first render creates
 * one slot per Hook call; later renders pair calls with slots *by position*.
 * Flip the condition and watch the pairing break in the broken variant.
 */
export default function HookSlotsDemo() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('conditional-effect');
  const [variant, setVariant] = useState<Variant>('broken');
  const [conditionAtMount, setConditionAtMount] = useState(true);
  const [conditionNow, setConditionNow] = useState(true);
  const scenarioFieldId = useId();

  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  if (!scenario) return null;
  const slots = hookCalls(scenarioId, variant, conditionAtMount);
  const calls = hookCalls(scenarioId, variant, conditionNow);
  const rows = compareSlots(slots, calls);
  const result = verdict(rows);

  return (
    <div className="stack">
      <Panel title="Simulation controls">
        <div className="row">
          <label htmlFor={scenarioFieldId}>Scenario</label>
          <select
            id={scenarioFieldId}
            value={scenarioId}
            onChange={(event) => {
              const next = event.target.value as ScenarioId;
              setScenarioId(next);
              // Start each scenario from its "happy" first render.
              const initial = next === 'conditional-effect';
              setConditionAtMount(initial);
              setConditionNow(initial);
            }}
          >
            {scenarios.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <fieldset className="row ap-fieldset">
            <legend className="visually-hidden">Code variant</legend>
            {(['broken', 'fixed'] as const).map((value) => (
              <label key={value} className="row small">
                <input
                  type="radio"
                  name="variant"
                  value={value}
                  checked={variant === value}
                  onChange={() => setVariant(value)}
                />
                {value === 'broken' ? 'Broken code' : 'Fixed code'}
              </label>
            ))}
          </fieldset>
        </div>
        <div className="row small">
          <label className="row">
            <input
              type="checkbox"
              checked={conditionAtMount}
              onChange={(event) => setConditionAtMount(event.target.checked)}
            />
            First render: {scenario.conditionLabel.toLowerCase()}
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={conditionNow}
              onChange={(event) => setConditionNow(event.target.checked)}
            />
            This render: {scenario.conditionLabel.toLowerCase()}
          </label>
        </div>
        <pre className="ap-code" aria-label={`${variant} code`}>
          <code>{variant === 'broken' ? scenario.broken : scenario.fixed}</code>
        </pre>
      </Panel>
      <Panel
        title="Hook slots"
        description="Slots are created on the first render; this render's calls are paired with them by index."
      >
        <div className="ap-table-wrap">
          <table className="ap-table">
            <caption className="visually-hidden">
              Hook slots compared with this render's calls
            </caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Slot (first render)</th>
                <th scope="col">Call (this render)</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.index} className={`ap-slot-${row.status}`}>
                  <td className="mono">{row.index}</td>
                  <td className="mono">
                    {row.slot ? `${row.slot.kind} · ${row.slot.label}` : '—'}
                  </td>
                  <td className="mono">
                    {row.call ? `${row.call.kind} · ${row.call.label}` : '—'}
                  </td>
                  <td>
                    <Badge tone={statusLabel[row.status].tone}>
                      {statusLabel[row.status].text}
                    </Badge>{' '}
                    <span className="small">{row.explanation}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div role="status">
          <Callout tone={result.tone} title="What React does">
            {result.message}
          </Callout>
        </div>
      </Panel>
    </div>
  );
}
