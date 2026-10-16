import { Router } from 'esp-js';
import { useReducer, useState } from 'react';
import { Button, Callout, Panel, ValueTable } from '../../components/ui';
import { EspRouterProvider, useEspReducer, type EspStoreAction } from '../../middleware/esp-js';

const INCREMENT = 'INCREMENT';
type Action = { type: typeof INCREMENT; payload: { by: number } };
type State = { count: number };

function counter(state: State, action: EspStoreAction<Action>): State {
  return action.type === INCREMENT ? { count: state.count + action.payload.by } : state;
}

/**
 * The same counter three ways: local useReducer (isolated), and two
 * esp-backed stores on one router that can talk to each other.
 */
export default function EspVsReducerDemo() {
  const [router] = useState(() => new Router());
  return (
    <div className="stack">
      <div className="grid">
        <LocalCounter />
        <EspRouterProvider router={router}>
          <EspCounter name="Tile A" />
          <EspCounter name="Tile B" />
        </EspRouterProvider>
      </div>
      <Callout title="What changes">
        <code>useReducer</code> state is private to one component. Each esp-backed store is still
        local React state, but its events travel through a shared router, so <em>Broadcast</em>{' '}
        updates every store that observes <code>INCREMENT</code> — without lifting state up or a
        global store. The cost: an extra dependency, string event types, and indirection that makes
        data flow harder to follow.
      </Callout>
    </div>
  );
}

function LocalCounter() {
  const [state, dispatch] = useReducer(counter, { count: 0 });
  return (
    <Panel title="Plain useReducer">
      <ValueTable rows={{ count: state.count }} />
      <Button onClick={() => dispatch({ type: INCREMENT, payload: { by: 1 } })}>Increment</Button>
    </Panel>
  );
}

function EspCounter({ name }: { name: string }) {
  const [state, dispatch, esp] = useEspReducer<State, Action>(
    counter,
    { count: 0 },
    {
      modelName: name.toLowerCase().replace(/\s+/g, '-'),
      observedEvents: [INCREMENT],
    },
  );
  return (
    <Panel title={`${name} (esp-js)`}>
      <ValueTable rows={{ count: state.count }} />
      <div className="row">
        <Button onClick={() => dispatch({ type: INCREMENT, payload: { by: 1 } })}>
          Local dispatch <span className="visually-hidden">{name}</span>
        </Button>
        <Button onClick={() => esp.publish(INCREMENT, { by: 1 })}>
          Publish <span className="visually-hidden">{name}</span>
        </Button>
        <Button variant="primary" onClick={() => esp.broadcast(INCREMENT, { by: 10 })}>
          Broadcast +10 <span className="visually-hidden">from {name}</span>
        </Button>
      </div>
    </Panel>
  );
}
