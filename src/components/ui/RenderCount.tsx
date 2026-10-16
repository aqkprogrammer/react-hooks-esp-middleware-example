import {
  Profiler,
  useCallback,
  useRef,
  type ProfilerOnRenderCallback,
  type ReactNode,
} from 'react';

export interface RenderCountProps {
  /** Shown next to the count, e.g. "List" → "List commits: 3". */
  label: string;
  children: ReactNode;
}

/**
 * Counts how many times React *commits* `children`, using the `<Profiler>`
 * API. The count is written straight to the DOM from the onRender callback,
 * so measuring does not itself trigger extra renders.
 *
 * Note: in development with Strict Mode, React intentionally double-invokes
 * renders, but Profiler reports commits, so the numbers stay meaningful.
 */
export function RenderCount({ label, children }: RenderCountProps) {
  const countRef = useRef(0);
  const outputRef = useRef<HTMLSpanElement>(null);
  const onRender = useCallback<ProfilerOnRenderCallback>((_id, _phase, actualDuration) => {
    countRef.current += 1;
    if (outputRef.current) {
      outputRef.current.textContent = `${countRef.current} (last ${actualDuration.toFixed(1)} ms)`;
    }
  }, []);
  return (
    <div className="render-count">
      <div className="render-count-label">
        {label} commits: <span ref={outputRef}>0</span>
      </div>
      <Profiler id={label} onRender={onRender}>
        {children}
      </Profiler>
    </div>
  );
}
