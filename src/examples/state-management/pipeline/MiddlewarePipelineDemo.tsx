import { useEffect, useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Callout,
  EventLog,
  Panel,
  TextField,
  useEventLog,
  type LogEntry,
} from '../../../components/ui';
import {
  createAnalyticsMiddleware,
  createErrorReportingMiddleware,
  createLogger,
  createPersistenceMiddleware,
  createThunkMiddleware,
  createValidationMiddleware,
  describeAction,
  hydrate,
  useReducerWithMiddleware,
  type AnalyticsEvent,
  type Middleware,
} from '../../../middleware/reducer';
import {
  addItem,
  addTopRatedProducts,
  CART_STORAGE_KEY,
  cartAnalytics,
  cartReducer,
  cartTotal,
  cartValidators,
  emptyCart,
  isCartItems,
  type CartAction,
  type CartDispatchable,
  type CartItem,
  type CartState,
} from './cart';
import {
  createPipelineTracer,
  STAGES,
  type EnabledStages,
  type StageName,
  type StageOutcome,
  type TraceStep,
} from './pipelineTrace';
import './MiddlewarePipelineDemo.css';

const stageInfo: Record<StageName, string> = {
  errorReporting: 'catches errors thrown further down',
  thunk: 'runs functions, passes plain actions on',
  logger: 'logs prev state, action, next state',
  validation: 'rejects invalid actions',
  analytics: 'tracks accepted actions',
  persistence: 'saves items (debounced)',
};

const outcomeLabel: Record<StageOutcome, string> = {
  passed: 'passed',
  stopped: 'stopped here',
  skipped: 'skipped (off)',
  reduced: 'reduced',
  threw: 'error thrown',
};

const allEnabled: EnabledStages = {
  errorReporting: true,
  thunk: true,
  logger: true,
  validation: true,
  analytics: true,
  persistence: true,
};

const money = (value: number) => `$${value.toFixed(2)}`;
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

interface Sinks {
  log: (message: string, tone?: LogEntry['tone']) => void;
  track: (event: AnalyticsEvent) => void;
  report: (message: string) => void;
  saved: (items: CartItem[]) => void;
}

/** Builds the store's middleware once per mounted demo (fresh state for every test). */
function createCartSetup(sinks: Sinks) {
  type M = Middleware<CartState, CartDispatchable>;
  const tracer = createPipelineTracer(allEnabled);
  const persistence = createPersistenceMiddleware<CartState, CartDispatchable, CartItem[]>({
    key: CART_STORAGE_KEY,
    select: (state) => state.items,
    debounceMs: 500,
    onSaved: sinks.saved,
    onError: (error) => sinks.report(`Persistence ${error.kind} error: ${errorText(error.error)}`),
  });
  const stages: ReadonlyArray<readonly [StageName, M]> = [
    [
      'errorReporting',
      createErrorReportingMiddleware<CartState, CartDispatchable>({
        report: ({ error, action }) =>
          sinks.report(`${errorText(error)} (while handling ${describeAction(action)})`),
        toAction: (error) => ({ type: 'ERROR_REPORTED', message: errorText(error) }),
      }),
    ],
    ['thunk', createThunkMiddleware<CartState, CartAction>()],
    [
      'logger',
      createLogger<CartState, CartDispatchable>({
        sink: ({ action, changed, durationMs }) =>
          sinks.log(
            `${describeAction(action)} → ${changed ? 'state changed' : 'state unchanged'} (${durationMs.toFixed(1)} ms)`,
            changed ? 'success' : 'info',
          ),
      }),
    ],
    [
      'validation',
      createValidationMiddleware<CartState, CartDispatchable>({
        validators: cartValidators,
        onInvalid: (errors, rejected) => ({
          type: 'VALIDATION_FAILED',
          errors,
          rejectedType: describeAction(rejected),
        }),
      }),
    ],
    [
      'analytics',
      createAnalyticsMiddleware<CartState, CartDispatchable>({
        track: sinks.track,
        events: cartAnalytics,
      }),
    ],
    ['persistence', persistence],
  ];
  const savedItems = hydrate({ key: CART_STORAGE_KEY, validate: isCartItems });
  return {
    tracer,
    persistence,
    middleware: tracer.instrument(stages),
    initialState: savedItems ? { ...emptyCart, items: savedItems } : emptyCart,
    restored: savedItems?.length ?? 0,
  };
}

/**
 * A cart built on `useReducerWithMiddleware` with six composable middleware.
 * Toggle any of them and watch how the same clicks behave differently.
 */
export default function MiddlewarePipelineDemo() {
  const { entries, log, clear } = useEventLog(30);
  const [tracked, setTracked] = useState<AnalyticsEvent[]>([]);
  const [reports, setReports] = useState<string[]>([]);
  const [lastSave, setLastSave] = useState<string | null>(null);
  const [setup] = useState(() =>
    createCartSetup({
      log,
      track: (event) => setTracked((previous) => [event, ...previous].slice(0, 8)),
      report: (message) => setReports((previous) => [message, ...previous].slice(0, 5)),
      saved: (items) => setLastSave(`Saved ${items.length} line(s) to localStorage.`),
    }),
  );
  const [state, dispatch, store] = useReducerWithMiddleware(
    cartReducer,
    setup.initialState,
    setup.middleware,
  );
  const [enabled, setEnabled] = useState<EnabledStages>(allEnabled);
  const [trace, setTrace] = useState<readonly TraceStep[]>([]);
  const [escaped, setEscaped] = useState<string | null>(null);

  useEffect(() => setup.tracer.subscribe(setTrace), [setup]);
  // Write any pending (debounced) save when the demo unmounts.
  useEffect(() => () => setup.persistence.flush(), [setup]);

  /** Without error reporting, a throwing reducer surfaces here, in the caller. */
  const send = (action: CartDispatchable) => {
    setEscaped(null);
    try {
      dispatch(action);
    } catch (error) {
      setEscaped(errorText(error));
    }
  };

  const toggle = (name: StageName, value: boolean) => {
    setup.tracer.setEnabled(name, value);
    setEnabled((previous) => ({ ...previous, [name]: value }));
  };

  return (
    <div className="stack">
      {setup.restored > 0 ? (
        <Callout tone="info" title="Restored from localStorage">
          {setup.restored} cart line(s) were hydrated by the persistence helper.
        </Callout>
      ) : null}

      <Panel
        title="Middleware pipeline"
        description="Actions flow top to bottom. Switch a middleware off to bypass it."
      >
        <fieldset className="mwp-toggles">
          <legend>Enabled middleware</legend>
          {STAGES.map((name) => (
            <label key={name} className="mwp-toggle">
              <input
                type="checkbox"
                checked={enabled[name]}
                onChange={(event) => toggle(name, event.target.checked)}
              />
              <span className="mono">{name}</span>
            </label>
          ))}
        </fieldset>
        <PipelineView enabled={enabled} trace={trace} />
      </Panel>

      <div className="grid">
        <Panel title="Cart">
          <CartForm
            errors={state.errors}
            onSubmit={(name, price, qty) => {
              send(addItem(name, price, qty));
              // dispatch is synchronous: the store already holds the result.
              return Object.keys(store.getState().errors).length === 0;
            }}
          />
          <CartList items={state.items} onRemove={(id) => send({ type: 'REMOVE_ITEM', id })} />
          <div className="row">
            <Button onClick={() => send(addTopRatedProducts())} disabled={state.loading}>
              {state.loading ? 'Loading products…' : 'Add 2 top-rated products (thunk)'}
            </Button>
            <Button variant="ghost" onClick={() => send({ type: 'CLEAR_CART' })}>
              Clear cart
            </Button>
            <Button variant="danger" onClick={() => send({ type: 'SIMULATE_REDUCER_BUG' })}>
              Trigger a reducer bug
            </Button>
          </div>
          {!enabled.thunk ? (
            <p className="small muted">
              Thunk is off: the loader function now reaches the reducer, which ignores it.
            </p>
          ) : null}
          {state.failure ? (
            <Callout tone="danger" title="Error shown from state">
              {state.failure}
            </Callout>
          ) : null}
          {escaped ? (
            <Callout tone="warn" title="Uncaught error escaped dispatch">
              {escaped}. With error reporting off, the exception propagated to the click handler
              (caught there so the page survives).
            </Callout>
          ) : null}
        </Panel>

        <div className="stack">
          <EventLog title="Logger output" entries={entries} onClear={clear} />
          <Panel title="Analytics events">
            <ol className="list small mono" aria-label="Analytics events">
              {tracked.length === 0 ? <li className="muted">No events tracked yet.</li> : null}
              {tracked.map((event, index) => (
                <li key={`${tracked.length - index}`}>
                  {event.name} {JSON.stringify(event.properties ?? {})}
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="Error reports">
            <ol className="list small" aria-label="Error reports">
              {reports.length === 0 ? <li className="muted">No errors reported.</li> : null}
              {reports.map((report, index) => (
                <li key={`${reports.length - index}`}>{report}</li>
              ))}
            </ol>
          </Panel>
          <p className="small muted" role="status">
            {lastSave ?? 'Persistence: nothing saved yet (writes 500 ms after the last change).'}
          </p>
        </div>
      </div>
    </div>
  );
}

function PipelineView({ enabled, trace }: { enabled: EnabledStages; trace: readonly TraceStep[] }) {
  const topLevel = trace.filter((step) => step.depth === 0);
  const dispatched = topLevel[0]?.action;
  const outcomeOf = (stage: TraceStep['stage']) =>
    topLevel.find((step) => step.stage === stage)?.outcome;
  return (
    <div className="stack">
      <ol className="mwp-pipeline" aria-label="Pipeline order">
        {[...STAGES, 'reducer' as const].map((stage, index) => {
          const outcome = outcomeOf(stage);
          const isOn = stage === 'reducer' || enabled[stage];
          return (
            <li
              key={stage}
              className="mwp-stage"
              data-outcome={outcome ?? 'none'}
              data-enabled={isOn}
            >
              <span className="mwp-stage-name mono">
                {index + 1}. {stage}
              </span>
              <span className="small muted">
                {stage === 'reducer' ? 'pure state transition' : stageInfo[stage]}
              </span>
              <span className="row">
                {stage === 'reducer' ? null : (
                  <Badge tone={isOn ? 'success' : 'neutral'}>{isOn ? 'on' : 'off'}</Badge>
                )}
                {dispatched ? (
                  <Badge tone={outcome === 'stopped' || outcome === 'threw' ? 'warn' : 'info'}>
                    {outcome ? outcomeLabel[outcome] : 'not reached'}
                  </Badge>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
      <div>
        <h4 className="mwp-trace-title">
          Last dispatch: <span className="mono">{dispatched ?? '—'}</span>
        </h4>
        <ol className="mwp-trace small mono" aria-label="Last dispatch trace">
          {trace.length === 0 ? (
            <li className="muted">Dispatch an action to see its path.</li>
          ) : null}
          {trace.map((step) => (
            <li key={step.id} style={{ marginInlineStart: `${step.depth * 1.25}rem` }}>
              {step.depth > 0 ? '↳ ' : ''}
              {step.action} @ {step.stage}: {outcomeLabel[step.outcome]}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function CartForm({
  errors,
  onSubmit,
}: {
  errors: CartState['errors'];
  onSubmit: (name: string, price: number, qty: number) => boolean;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('4.50');
  const [qty, setQty] = useState('1');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const accepted = onSubmit(name, Number(price), Number(qty));
    if (accepted) setName('');
  };
  return (
    <form className="stack" onSubmit={submit} noValidate aria-label="Add a product">
      <TextField
        label="Product"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
      />
      <div className="row">
        <TextField
          label="Price"
          type="number"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          error={errors.price}
        />
        <TextField
          label="Quantity"
          type="number"
          value={qty}
          onChange={(event) => setQty(event.target.value)}
          error={errors.qty}
        />
      </div>
      {errors.cart ? <p className="field-error">{errors.cart}</p> : null}
      <div>
        <Button type="submit" variant="primary">
          Add to cart
        </Button>
      </div>
    </form>
  );
}

function CartList({ items, onRemove }: { items: CartItem[]; onRemove: (id: string) => void }) {
  return (
    <div className="stack">
      <ul className="list" aria-label="Cart items">
        {items.length === 0 ? <li className="muted">The cart is empty.</li> : null}
        {items.map((item) => (
          <li key={item.id} className="spread">
            <span>
              {item.name || '(no name)'} × {item.qty}{' '}
              <span className="muted">{money(item.price * item.qty)}</span>
            </span>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Remove ${item.name || 'unnamed item'}`}
              onClick={() => onRemove(item.id)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <p className="small">
        Total: <strong>{money(cartTotal(items))}</strong>
      </p>
    </div>
  );
}
