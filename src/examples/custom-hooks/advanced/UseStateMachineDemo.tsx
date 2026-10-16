import { useId, useState } from 'react';
import { Button, Callout, EventLog, Panel, ValueTable, useEventLog } from '../../../components/ui';
import { useStateMachine, type MachineConfig } from '../../../hooks/advanced';
import './UseStateMachineDemo.css';

type State = 'idle' | 'loading' | 'success' | 'failure';
type Event =
  | { type: 'FETCH'; key: string; failures: number }
  | { type: 'RESOLVE'; message: string }
  | { type: 'REJECT'; message: string }
  | { type: 'RETRY' }
  | { type: 'CANCEL' }
  | { type: 'RESET' };
interface Context {
  key: string;
  failures: number;
  attempts: number;
  message: string | null;
}

const MAX_ATTEMPTS = 3;
const states: State[] = ['idle', 'loading', 'success', 'failure'];

function createMachine(log: (message: string) => void): MachineConfig<State, Context, Event> {
  return {
    initial: 'idle',
    context: { key: '', failures: 0, attempts: 0, message: null },
    states: {
      idle: {
        on: {
          FETCH: {
            target: 'loading',
            assign: (_context, event) => ({
              key: event.key,
              failures: event.failures,
              attempts: 1,
              message: null,
            }),
          },
        },
      },
      loading: {
        // Entry action = effect: start the request, abort it when leaving the state.
        entry: ({ context, send }) => {
          const controller = new AbortController();
          log(`GET /api/flaky (attempt ${context.attempts})`);
          fetch(`/api/flaky?key=${context.key}&failures=${context.failures}&delay=300`, {
            signal: controller.signal,
          })
            .then(async (response) => {
              const body = (await response.json()) as { message: string };
              send(
                response.ok
                  ? { type: 'RESOLVE', message: body.message }
                  : { type: 'REJECT', message: body.message },
              );
            })
            .catch((error: unknown) => {
              if (!controller.signal.aborted) send({ type: 'REJECT', message: String(error) });
            });
          return () => {
            if (!controller.signal.aborted) controller.abort();
          };
        },
        on: {
          RESOLVE: {
            target: 'success',
            assign: (context, event) => ({ ...context, message: event.message }),
          },
          REJECT: {
            target: 'failure',
            assign: (context, event) => ({ ...context, message: event.message }),
          },
          CANCEL: {
            target: 'idle',
            assign: (context) => ({ ...context, message: 'Cancelled (request aborted)' }),
          },
        },
      },
      success: { on: { RESET: 'idle' } },
      failure: {
        on: {
          RETRY: {
            target: 'loading',
            guard: (context) => context.attempts < MAX_ATTEMPTS,
            assign: (context) => ({ ...context, attempts: context.attempts + 1 }),
          },
          RESET: 'idle',
        },
      },
    },
  };
}

export default function UseStateMachineDemo() {
  const failuresId = useId();
  const [failures, setFailures] = useState(2);
  const { entries, log, clear } = useEventLog(20);
  const machine = useStateMachine(createMachine(log));
  const { value, context } = machine;

  const send = (event: Event) => {
    log(`send ${event.type}${machine.can(event) ? '' : ' (ignored)'}`);
    machine.send(event);
  };

  return (
    <div className="stack">
      <Panel
        title="Request lifecycle"
        description={`The server fails the first N calls for a key. Retrying is allowed while attempts < ${MAX_ATTEMPTS} (a guard).`}
      >
        <ol className="use-state-machine-states" aria-label="Machine states">
          {states.map((state) => (
            <li key={state} aria-current={state === value ? 'step' : undefined}>
              {state}
            </li>
          ))}
        </ol>
        <div className="row">
          <label htmlFor={failuresId}>Server failures before success</label>
          <select
            id={failuresId}
            value={failures}
            disabled={value !== 'idle'}
            onChange={(event) => setFailures(Number(event.target.value))}
          >
            {[0, 1, 2, 3, 5].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>
        <div className="row">
          <Button
            variant="primary"
            disabled={!machine.can({ type: 'FETCH', key: '', failures })}
            onClick={() =>
              // A fresh key per run, so the mock server counts failures from zero.
              send({
                type: 'FETCH',
                key: `machine-demo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                failures,
              })
            }
          >
            Fetch
          </Button>
          {(['RETRY', 'CANCEL', 'RESET'] as const).map((type) => (
            <Button key={type} disabled={!machine.can({ type })} onClick={() => send({ type })}>
              {type.toLowerCase()}
            </Button>
          ))}
        </div>
        <ValueTable
          label="Machine snapshot"
          rows={{
            State: value,
            Attempts: `${context.attempts} / ${MAX_ATTEMPTS}`,
            Message: context.message ?? '—',
          }}
        />
        {value === 'failure' && !machine.can({ type: 'RETRY' }) ? (
          <Callout tone="warn" title="Guard blocked RETRY">
            The retry limit is reached. Reset and try again with fewer server failures.
          </Callout>
        ) : null}
      </Panel>
      <EventLog entries={entries} onClear={clear} />
    </div>
  );
}
