import { Router } from 'esp-js';
import { useState } from 'react';
import { Badge, Button, Callout, Panel, ValueTable, show } from '../../components/ui';
import { EspRouterProvider, useEspReducer, type EspStoreAction } from '../../middleware/esp-js';

const PING = 'PING';
const POISON = 'POISON';

type Action = { type: typeof PING } | { type: typeof POISON };
type State = { pings: number };

function reducer(state: State, action: EspStoreAction<Action>): State {
  switch (action.type) {
    case PING:
      return { pings: state.pings + 1 };
    case POISON:
      // Reducers should never throw; this one does to demonstrate isolation.
      throw new Error('Reducer crashed while handling POISON');
    default:
      return state;
  }
}

/**
 * An exception inside an esp-js observer halts the router permanently. The
 * bridge wraps every dispatch, reports the error and keeps the router alive.
 */
export default function EspErrorIsolationDemo() {
  const [router] = useState(() => new Router());
  return (
    <EspRouterProvider router={router}>
      <Isolated router={router} />
    </EspRouterProvider>
  );
}

function Isolated({ router }: { router: Router }) {
  const [errors, setErrors] = useState<string[]>([]);
  const [routerStatus, setRouterStatus] = useState(String(router.currentStatus));
  const [state, , esp] = useEspReducer<State, Action>(
    reducer,
    { pings: 0 },
    {
      modelName: 'isolated',
      observedEvents: [PING, POISON],
      onError: (error) => setErrors((previous) => [show(error), ...previous].slice(0, 5)),
    },
  );

  const send = (eventType: string) => {
    esp.publish(eventType, {});
    setRouterStatus(String(router.currentStatus));
  };

  return (
    <div className="stack">
      <Panel title="Router health">
        <div className="row">
          <Button onClick={() => send(PING)}>Publish PING</Button>
          <Button variant="danger" onClick={() => send(POISON)}>
            Publish POISON (reducer throws)
          </Button>
        </div>
        <ValueTable
          rows={{
            'PINGs handled': state.pings,
            'Router status': (
              <Badge tone={routerStatus === 'halted' ? 'warn' : 'success'}>{routerStatus}</Badge>
            ),
            'Errors reported': errors.length,
          }}
        />
        {errors.length ? (
          <ul className="list" aria-label="Reported errors">
            {errors.map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
        ) : null}
      </Panel>
      <Callout tone="warn" title="Why the guard matters">
        Without the bridge's try/catch, esp-js logs “The ESP router has caught an unhandled error
        and will halt”, sets its status to <code>halted</code>, and every later publish throws —
        every tile on the router stops working. With the guard, PING keeps working after POISON.
      </Callout>
    </div>
  );
}
