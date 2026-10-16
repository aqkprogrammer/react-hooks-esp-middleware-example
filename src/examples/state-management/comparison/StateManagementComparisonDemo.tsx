import { useId, useState } from 'react';
import { Callout } from '../../../components/ui';
import { approaches, needLabels, type Need } from './comparisonData';
import './StateManagementComparisonDemo.css';

const needs = Object.keys(needLabels) as Need[];

/** A comparison table with a "what do you need?" filter. */
export default function StateManagementComparisonDemo() {
  const [need, setNeed] = useState<Need | 'all'>('all');
  const selectId = useId();
  const rows = need === 'all' ? approaches : approaches.filter((row) => row.fits.includes(need));
  return (
    <div className="stack">
      <div className="field">
        <label htmlFor={selectId} className="field-label">
          What do you need?
        </label>
        <select
          id={selectId}
          value={need}
          onChange={(event) => setNeed(event.target.value as Need | 'all')}
        >
          <option value="all">Show every approach</option>
          {needs.map((option) => (
            <option key={option} value={option}>
              {needLabels[option]}
            </option>
          ))}
        </select>
      </div>
      <p className="small muted" role="status">
        {rows.length} of {approaches.length} approaches shown.
      </p>
      <div className="smc-scroll" role="region" aria-label="Comparison table" tabIndex={0}>
        <table className="smc-table">
          <caption className="visually-hidden">State management approaches compared</caption>
          <thead>
            <tr>
              <th scope="col">Approach</th>
              <th scope="col">State lives</th>
              <th scope="col">Re-renders</th>
              <th scope="col">Side effects</th>
              <th scope="col">Dependency</th>
              <th scope="col">Best for</th>
              <th scope="col">Avoid when</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.name}</th>
                <td>{row.lives}</td>
                <td>{row.updates}</td>
                <td>{row.effects}</td>
                <td>{row.dependency}</td>
                <td>{row.bestFor}</td>
                <td>{row.avoidWhen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Callout title="Rule of thumb">
        Separate <strong>server state</strong> (use a query cache) from{' '}
        <strong>client state</strong>. Start with <code>useState</code>/<code>useReducer</code>,
        lift to context for low-frequency shared values, and reach for a store when many components
        need fine-grained subscriptions or when updates need middleware.
      </Callout>
    </div>
  );
}
