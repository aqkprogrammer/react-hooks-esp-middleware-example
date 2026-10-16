import * as React from 'react';
import { useId, useState } from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import { Badge, Callout, Panel, TextField } from '../../../components/ui';
import {
  compatibility,
  compatibilityGroups,
  type CompatibilityRow,
  type CompatibilityStatus,
  type ModuleName,
} from './compatibilityData';
import './CompatibilityDemo.css';

const modules: Record<ModuleName, object> = {
  react: React,
  'react-dom': ReactDOM,
  'react-dom/client': ReactDOMClient,
};

const statusTone: Record<CompatibilityStatus, 'success' | 'info' | 'warn' | 'neutral'> = {
  stable: 'success',
  'dev-only': 'info',
  'server-only': 'info',
  superseded: 'warn',
  deprecated: 'warn',
  removed: 'neutral',
};

/** Checks the row against the modules actually loaded in this page. */
function installedState(row: CompatibilityRow): string {
  if (!row.module || !row.exportName) return 'behaviour';
  const present = row.exportName in modules[row.module];
  return present ? 'exported' : 'not exported';
}

/**
 * Every built-in Hook / API in the playground with the React version that
 * introduced it, grouped by release, plus legacy APIs that React 19 changed.
 * The "Installed build" column is computed live from the loaded modules.
 */
export default function CompatibilityDemo() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | CompatibilityStatus>('all');
  const statusId = useId();
  const needle = query.trim().toLowerCase();
  const matches = (row: CompatibilityRow) =>
    (status === 'all' || row.status === status) &&
    (!needle ||
      row.name.toLowerCase().includes(needle) ||
      row.notes.toLowerCase().includes(needle));

  return (
    <div className="stack">
      <Panel
        title="Filter"
        description={`Installed: react ${React.version}, react-dom ${ReactDOM.version}.`}
      >
        <div className="row">
          <TextField
            label="Search APIs"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="field">
            <label className="field-label" htmlFor={statusId}>
              Status
            </label>
            <select
              id={statusId}
              value={status}
              onChange={(event) => setStatus(event.target.value as 'all' | CompatibilityStatus)}
            >
              <option value="all">all</option>
              {Object.keys(statusTone).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Panel>
      {compatibilityGroups.map((group) => {
        const rows = compatibility.filter((row) => row.group === group.id && matches(row));
        if (rows.length === 0) return null;
        return (
          <section key={group.id} className="stack" aria-labelledby={`compat-${group.id}`}>
            <h3 id={`compat-${group.id}`} className="panel-title">
              {group.title}
            </h3>
            <p className="small muted">{group.description}</p>
            <div className="compat-table-wrap">
              <table className="compat-table">
                <caption className="visually-hidden">{group.title}</caption>
                <thead>
                  <tr>
                    <th scope="col">API</th>
                    <th scope="col">Since</th>
                    <th scope="col">Status</th>
                    <th scope="col">Installed build</th>
                    <th scope="col">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.name}>
                      <th scope="row">
                        <code>{row.name}</code>
                        {row.module ? <div className="small muted">{row.module}</div> : null}
                      </th>
                      <td className="mono">{row.minVersion}</td>
                      <td>
                        <Badge tone={statusTone[row.status]}>{row.status}</Badge>
                      </td>
                      <td className="small">{installedState(row)}</td>
                      <td className="small">
                        {row.notes}
                        {row.demo ? <div className="muted">Demo: {row.demo}</div> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      <Callout title="“Since” for removed APIs">
        For rows marked <em>removed</em>, the version is the release that removed them. Typings
        follow the same versions: <code>@types/react</code> 19.3 types every API listed here.
      </Callout>
    </div>
  );
}
