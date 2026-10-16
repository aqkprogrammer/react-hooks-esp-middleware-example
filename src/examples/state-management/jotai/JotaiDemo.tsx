import { Provider, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Suspense, useId } from 'react';
import { Button, Callout, Panel, TextField, ValueTable } from '../../../components/ui';
import {
  clearFiltersAtom,
  roleAtom,
  searchAtom,
  selectedUserAtom,
  selectedUserIdAtom,
  usersStatusAtom,
  visibleUsersAtom,
  type RoleFilter,
} from './usersAtoms';

const roles: RoleFilter[] = ['all', 'admin', 'editor', 'viewer'];

/** Jotai: primitive, derived, async and write-only atoms, scoped by a Provider. */
export default function JotaiDemo() {
  return (
    <Provider>
      <div className="grid">
        <Panel title="Directory" description="Filters are atoms; the list is a derived atom.">
          <Filters />
          <UserList />
        </Panel>
        <Panel title="Profile" description="An async derived atom read under Suspense.">
          <Suspense fallback={<p role="status">Loading profile…</p>}>
            <Profile />
          </Suspense>
        </Panel>
      </div>
    </Provider>
  );
}

function Filters() {
  const [search, setSearch] = useAtom(searchAtom);
  const [role, setRole] = useAtom(roleAtom);
  const clearFilters = useSetAtom(clearFiltersAtom);
  const roleId = useId();
  return (
    <div className="row">
      <TextField
        label="Search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <div className="field">
        <label htmlFor={roleId} className="field-label">
          Role
        </label>
        <select
          id={roleId}
          value={role}
          onChange={(event) => setRole(event.target.value as RoleFilter)}
        >
          {roles.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <Button variant="ghost" onClick={clearFilters}>
        Clear filters
      </Button>
    </div>
  );
}

function UserList() {
  const status = useAtomValue(usersStatusAtom);
  const users = useAtomValue(visibleUsersAtom);
  const [selectedId, setSelectedId] = useAtom(selectedUserIdAtom);
  if (status.state === 'loading') return <p role="status">Loading users…</p>;
  if (status.state === 'error') {
    return (
      <Callout tone="danger" title="Could not load users">
        {status.error}
      </Callout>
    );
  }
  return (
    <ul className="list" aria-label="Users">
      {users.length === 0 ? <li className="muted">No users match.</li> : null}
      {users.map((user) => (
        <li key={user.id} className={user.id === selectedId ? 'spread active' : 'spread'}>
          <span>
            {user.name} <span className="muted small">({user.role})</span>
          </span>
          <Button
            size="sm"
            aria-pressed={user.id === selectedId}
            onClick={() => setSelectedId(user.id)}
            aria-label={`View ${user.name}`}
          >
            View
          </Button>
        </li>
      ))}
    </ul>
  );
}

function Profile() {
  const result = useAtomValue(selectedUserAtom);
  if (result === null) return <p className="muted">Select a user to load their profile.</p>;
  if (!result.ok) {
    return (
      <Callout tone="danger" title="Could not load the profile">
        {result.error}
      </Callout>
    );
  }
  const user = result.data;
  return (
    <ValueTable
      label="Selected user"
      rows={{ Name: user.name, Email: user.email, Role: user.role }}
    />
  );
}
