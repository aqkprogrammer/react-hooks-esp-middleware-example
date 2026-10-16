import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { Button, Callout, Panel, RenderCount } from '../../../components/ui';

// ---------------------------------------------------------------------------
// Naive: one context, value object recreated on every provider render.
// ---------------------------------------------------------------------------

interface CounterValue {
  count: number;
  increment: () => void;
}

const NaiveContext = createContext<CounterValue | null>(null);

function useNaive(): CounterValue {
  const value = useContext(NaiveContext);
  if (!value) throw new Error('useNaive must be used inside <NaiveProvider>');
  return value;
}

function NaiveProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const [tick, setTick] = useState(0);
  // New object (and new function) every render → every consumer re-renders,
  // even when only `tick`, which no consumer reads, changed.
  const value = { count, increment: () => setCount((c) => c + 1) };
  return (
    <NaiveContext value={value}>
      {children}
      <UnrelatedUpdate tick={tick} onClick={() => setTick((t) => t + 1)} label="naive" />
    </NaiveContext>
  );
}

// ---------------------------------------------------------------------------
// Optimised: state and dispatch split into two contexts, values stable.
// ---------------------------------------------------------------------------

const CountContext = createContext<number | null>(null);
const SetCountContext = createContext<Dispatch<SetStateAction<number>> | null>(null);

function useCount(): number {
  const value = useContext(CountContext);
  if (value === null) throw new Error('useCount must be used inside <SplitProvider>');
  return value;
}

function useIncrement(): () => void {
  const setCount = useContext(SetCountContext);
  if (!setCount) throw new Error('useIncrement must be used inside <SplitProvider>');
  return useCallback(() => setCount((c) => c + 1), [setCount]);
}

function SplitProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const [tick, setTick] = useState(0);
  // `count` is a primitive and `setCount` is stable, so neither context value
  // changes unless the count does. For object values, wrap them in useMemo.
  return (
    <SetCountContext value={setCount}>
      <CountContext value={count}>
        {children}
        <UnrelatedUpdate tick={tick} onClick={() => setTick((t) => t + 1)} label="optimised" />
      </CountContext>
    </SetCountContext>
  );
}

// ---------------------------------------------------------------------------
// Optimised alternative: one context with a memoised object value.
// ---------------------------------------------------------------------------

const MemoContext = createContext<CounterValue | null>(null);

function useMemoCounter(): CounterValue {
  const value = useContext(MemoContext);
  if (!value) throw new Error('useMemoCounter must be used inside <MemoProvider>');
  return value;
}

function MemoProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const [tick, setTick] = useState(0);
  const increment = useCallback(() => setCount((c) => c + 1), []);
  const value = useMemo(() => ({ count, increment }), [count, increment]);
  return (
    <MemoContext value={value}>
      {children}
      <UnrelatedUpdate tick={tick} onClick={() => setTick((t) => t + 1)} label="memoised" />
    </MemoContext>
  );
}

function UnrelatedUpdate({
  tick,
  onClick,
  label,
}: {
  tick: number;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button size="sm" variant="ghost" onClick={onClick} aria-label={`Unrelated ${label} update`}>
      Unrelated provider update ({tick})
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Consumers
// ---------------------------------------------------------------------------

function NaiveCount() {
  return <p>Count: {useNaive().count}</p>;
}
function NaiveButton() {
  const { increment } = useNaive();
  return <Button onClick={increment}>Increment (naive)</Button>;
}
function SplitCount() {
  return <p>Count: {useCount()}</p>;
}
function SplitButton() {
  const increment = useIncrement();
  return <Button onClick={increment}>Increment (split)</Button>;
}
function MemoCount() {
  return <p>Count: {useMemoCounter().count}</p>;
}
function MemoButton() {
  const { increment } = useMemoCounter();
  return <Button onClick={increment}>Increment (memoised)</Button>;
}

/**
 * Avoiding unnecessary context re-renders. Consumers are passed to the
 * providers as `children`, so the only reason they re-render is the context.
 */
export default function UseContextPerformanceDemo() {
  return (
    <div className="stack">
      <div className="grid">
        <Panel title="Naive: inline object value" description="value = { count, increment }">
          <NaiveProvider>
            <RenderCount label="Naive display">
              <NaiveCount />
            </RenderCount>
            <RenderCount label="Naive button">
              <NaiveButton />
            </RenderCount>
          </NaiveProvider>
        </Panel>
        <Panel
          title="Split state / dispatch contexts"
          description="The button only reads the stable setter."
        >
          <SplitProvider>
            <RenderCount label="Split display">
              <SplitCount />
            </RenderCount>
            <RenderCount label="Split button">
              <SplitButton />
            </RenderCount>
          </SplitProvider>
        </Panel>
        <Panel title="Memoised object value" description="useMemo + useCallback on the value.">
          <MemoProvider>
            <RenderCount label="Memoised display">
              <MemoCount />
            </RenderCount>
            <RenderCount label="Memoised button">
              <MemoButton />
            </RenderCount>
          </MemoProvider>
        </Panel>
      </div>
      <Callout title="What to look for">
        Click <em>Increment</em> and <em>Unrelated provider update</em> in each panel. Every
        component that reads a context re-renders whenever that context&apos;s value changes
        identity — <code>memo</code> cannot stop it. Keep values stable, split rarely-changing
        dispatchers from frequently-changing state, and pass consumers as <code>children</code>.
      </Callout>
    </div>
  );
}
