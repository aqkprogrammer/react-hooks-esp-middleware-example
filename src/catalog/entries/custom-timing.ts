import type { CatalogEntry } from '../types';

const SSR_TEST = 'hooks/timing/timing.ssr.test.tsx';

export const entries: CatalogEntry[] = [
  {
    id: 'use-debounce',
    title: 'useDebounce',
    section: 'custom',
    category: 'Timing & scheduling',
    level: 'beginner',
    summary: 'A value that only updates after it has stopped changing for `delayMs`.',
    tags: ['debounce', 'search', 'input', 'performance'],
    demo: 'examples/custom-hooks/timing/UseDebounceDemo.tsx',
    sources: [
      'hooks/timing/useDebounce.ts',
      'hooks/timing/useDebouncedCallback.ts',
      'hooks/timing/debouncer.ts',
    ],
    tests: [
      'hooks/timing/useDebounce.test.tsx',
      'examples/custom-hooks/timing/UseDebounceDemo.test.tsx',
      SSR_TEST,
    ],
    minReact: '16.8',
    support: { level: 'universal', notes: 'Returns the initial value on the server.' },
    officialDocs: [
      { label: 'useDeferredValue', url: 'https://react.dev/reference/react/useDeferredValue' },
    ],
    related: ['use-debounced-callback', 'use-throttle', 'testing-fake-timers'],
    concept:
      'Publishes `value` into its own state through a debounced setter. The first render returns `value` directly.',
    problem:
      'Running a filter or a request on every keystroke wastes work and causes flicker; only the value after the user pauses matters.',
    whenToUse: ['Search-as-you-type, autocomplete, validation that hits the network, URL syncing.'],
    whenNotToUse: [
      'Keeping typing responsive while an *expensive render* catches up — `useDeferredValue` adapts to the device instead of a fixed delay and never delays fast renders.',
      'Fetching: also cancel stale requests (AbortController) or use TanStack Query/SWR with the debounced key — debouncing alone does not prevent out-of-order responses.',
      'You need leading-edge calls, `cancel` or `flush` — use `useDebouncedCallback`.',
    ],
    api: {
      signature:
        'function useDebounce<T>(value: T, delayMs: number, options?: { maxWait?: number }): T',
      params: [
        { name: 'value', type: 'T', description: 'The fast-changing value.' },
        { name: 'delayMs', type: 'number', description: 'Quiet period before publishing.' },
        {
          name: 'options.maxWait',
          type: 'number',
          description: 'Publish at least this often while the value keeps changing.',
          optional: true,
        },
      ],
      returns: 'The debounced value.',
    },
    execution: [
      'Render: returns the published state.',
      'Effect (value changed): forwards the value to the debounced setter, unless it equals the published value and nothing is pending (mount, or right after publishing).',
      'Timer: publishes the latest value; React bails out if it is unchanged.',
      'Unmount: the pending timer is cleared.',
    ],
    edgeCases: [
      'Function values are stored, not called (the setter wraps them in an updater).',
      'A→B→A within the delay publishes A again, which is a no-op render-wise.',
    ],
    testing:
      'Fake-timer tests cover the trailing update, `maxWait`, function values, no timer on mount and unmount cleanup; the demo test checks raw vs debounced values and the delay selector.',
  },
  {
    id: 'use-debounced-callback',
    title: 'useDebouncedCallback',
    section: 'custom',
    category: 'Timing & scheduling',
    level: 'intermediate',
    summary:
      'A stable debounced function with leading/trailing edges, `maxWait`, `cancel`, `flush` and `isPending`.',
    tags: ['debounce', 'autosave', 'lodash', 'leading', 'trailing', 'maxWait', 'cancel', 'flush'],
    demo: 'examples/custom-hooks/timing/UseDebouncedCallbackDemo.tsx',
    sources: ['hooks/timing/useDebouncedCallback.ts', 'hooks/timing/debouncer.ts'],
    tests: [
      'hooks/timing/useDebouncedCallback.test.tsx',
      'examples/custom-hooks/timing/UseDebouncedCallbackDemo.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'Lodash debounce (same algorithm)',
        url: 'https://lodash.com/docs/4.17.15#debounce',
      },
      {
        label: 'MDN: setTimeout',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout',
      },
    ],
    related: ['use-debounce', 'use-throttle', 'use-stable-callback', 'testing-fake-timers'],
    concept:
      'A framework-agnostic debounce engine (lodash algorithm) is created once per component. A layout effect hands it the newest callback and options after every commit, so the returned function never changes identity and never calls a stale closure.',
    problem:
      '`useMemo(() => debounce(fn, 300), [fn])` recreates the debouncer (losing pending calls) whenever `fn` changes, keeps firing after unmount, and closes over stale props when `fn` is omitted from the dependencies.',
    whenToUse: [
      'Autosave, analytics, resize/scroll handlers that do expensive work, sending a request after typing stops.',
    ],
    whenNotToUse: [
      'You only need a debounced *value* — use `useDebounce`.',
      'Work that must happen at regular intervals during the activity — use `useThrottledCallback`.',
    ],
    api: {
      signature:
        'function useDebouncedCallback<Args extends unknown[]>(callback: (...args: Args) => void, delayMs: number, options?: { leading?: boolean; trailing?: boolean; maxWait?: number }): DebouncedFunction<Args>',
      params: [
        {
          name: 'callback',
          type: '(...args) => void',
          description: 'May change every render; the latest one runs.',
        },
        {
          name: 'delayMs',
          type: 'number',
          description: 'Quiet period (negative values count as 0).',
        },
        {
          name: 'options.leading',
          type: 'boolean',
          description: 'Invoke on the first call of a burst (default false).',
          optional: true,
        },
        {
          name: 'options.trailing',
          type: 'boolean',
          description: 'Invoke after the burst with the latest arguments (default true).',
          optional: true,
        },
        {
          name: 'options.maxWait',
          type: 'number',
          description: 'Upper bound on how long a call can be postponed (clamped to ≥ delay).',
          optional: true,
        },
      ],
      returns:
        'A stable function with `cancel()`, `flush()` and `isPending()` (not reactive — read it in handlers).',
    },
    execution: [
      'Render: returns the same function every time; nothing is read from refs.',
      'Layout effect: the engine receives the latest callback and options; if the delay/edges changed, a scheduled timer is re-evaluated (measured from the last call).',
      'Call: records arguments; leading edge invokes immediately when enabled; a single timer handles the trailing edge and `maxWait`.',
      'Unmount: the engine is disabled — pending work is cancelled and later calls are ignored. (Strict Mode re-enables it on the simulated remount.)',
    ],
    mistakes: [
      {
        title: 'Recreating the debouncer on every render',
        wrong: 'const save = debounce((text) => api.save(text), 500);',
        why: 'Each render creates a new debouncer with its own timer, so nothing is debounced and old timers still fire after unmount.',
        right: 'const save = useDebouncedCallback((text) => api.save(text), 500);',
      },
    ],
    edgeCases: [
      'With `leading: true` and a single call, the callback runs once (not on both edges).',
      '`flush()` does nothing when there is no pending trailing call; with `trailing: false` there never is.',
      'Changing to a *shorter* delay while pending fires on the next tick if the new delay has already elapsed.',
      'Call `flush()` in your own cleanup if pending work must be saved on unmount.',
    ],
    testing:
      'Fake-timer tests cover trailing/leading combinations, `maxWait`, `cancel`, `flush`, `isPending`, latest callback with stable identity, no calls after unmount (and no timers left) and delay changes in both directions.',
    production: [
      'Pair autosave with a `beforeunload`/`visibilitychange` flush so the last edit is not lost.',
    ],
    diagram: {
      title: 'Debounce with maxWait',
      description:
        'A burst of calls produces one trailing invocation, or one per maxWait while it continues.',
      mermaid:
        'sequenceDiagram\n  participant UI as Event handler\n  participant D as Debouncer\n  participant CB as Latest callback\n  UI->>D: call(a)\n  D->>D: start timer (delay)\n  UI->>D: call(b)\n  D->>D: remember b, keep timer\n  Note over D: maxWait reached while calls continue\n  D->>CB: invoke(b)\n  UI->>D: call(c)\n  Note over D: quiet for delay ms\n  D->>CB: invoke(c)\n  UI->>D: unmount\n  D->>D: cancel and ignore later calls',
    },
  },
  {
    id: 'use-throttle',
    title: 'useThrottle / useThrottledCallback',
    section: 'custom',
    category: 'Timing & scheduling',
    level: 'intermediate',
    summary:
      'Run a callback (or publish a value) at most once per interval while events keep coming.',
    tags: ['throttle', 'scroll', 'pointermove', 'rate limit', 'leading', 'trailing'],
    demo: 'examples/custom-hooks/timing/DebounceVsThrottleDemo.tsx',
    sources: [
      'hooks/timing/useThrottledCallback.ts',
      'hooks/timing/useThrottle.ts',
      'hooks/timing/debouncer.ts',
    ],
    tests: [
      'hooks/timing/useThrottledCallback.test.tsx',
      'hooks/timing/useThrottle.test.tsx',
      'examples/custom-hooks/timing/DebounceVsThrottleDemo.test.tsx',
      SSR_TEST,
    ],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [{ label: 'Lodash throttle', url: 'https://lodash.com/docs/4.17.15#throttle' }],
    related: ['use-debounced-callback', 'use-debounce', 'use-animation-frame'],
    concept:
      'Throttling is debouncing with `maxWait = interval`, so both hooks are thin layers over `useDebouncedCallback` — no duplicated timer logic. `useThrottle` publishes a value through a throttled setter.',
    problem:
      'High-frequency events (pointer, scroll, resize, sliders) fire dozens of times per frame; doing work on each one janks the page, while debouncing would show nothing until the user stops.',
    whenToUse: [
      'Live previews while dragging, scroll-position persistence, sending cursor positions over a socket.',
    ],
    whenNotToUse: [
      'Visual updates synchronised with painting — use `useAnimationFrame` (one update per frame) or CSS.',
      'You only care about the final value — debounce instead.',
    ],
    api: {
      signature:
        'function useThrottledCallback<Args extends unknown[]>(callback: (...args: Args) => void, intervalMs: number, options?: { leading?: boolean; trailing?: boolean }): DebouncedFunction<Args>\nfunction useThrottle<T>(value: T, intervalMs: number, options?: { leading?: boolean; trailing?: boolean }): T',
      params: [
        { name: 'intervalMs', type: 'number', description: 'Minimum time between invocations.' },
        {
          name: 'options.leading',
          type: 'boolean',
          description: 'Invoke on the first call (default true).',
          optional: true,
        },
        {
          name: 'options.trailing',
          type: 'boolean',
          description: 'Invoke once more with the latest arguments at the end (default true).',
          optional: true,
        },
      ],
      returns:
        'A stable throttled function with `cancel`/`flush`/`isPending`, or the throttled value.',
    },
    edgeCases: [
      '`useThrottle` publishes the leading-edge value from an Effect, which costs one extra render.',
      'With `trailing: false` the last events of a burst are dropped.',
    ],
    testing:
      'Fake-timer tests cover leading + trailing calls, regular invocations during a stream, disabled edges, value publishing (including changing back) and unmount cleanup; the demo plots raw vs debounced vs throttled calls.',
  },
  {
    id: 'use-interval',
    title: 'useInterval',
    section: 'custom',
    category: 'Timing & scheduling',
    level: 'beginner',
    summary: 'Declarative `setInterval`: latest callback, `null` pauses, delay changes restart.',
    tags: ['interval', 'polling', 'timer', 'dan abramov', 'stale closure'],
    demo: 'examples/custom-hooks/timing/UseIntervalDemo.tsx',
    sources: ['hooks/timing/useInterval.ts', 'hooks/state/useLatest.ts'],
    tests: [
      'hooks/timing/useInterval.test.tsx',
      'examples/custom-hooks/timing/UseIntervalDemo.test.tsx',
      SSR_TEST,
    ],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'Making setInterval declarative with React Hooks',
        url: 'https://overreacted.io/making-setinterval-declarative-with-react-hooks/',
      },
      { label: 'useEffectEvent', url: 'https://react.dev/reference/react/useEffectEvent' },
    ],
    related: ['use-timeout', 'use-latest', 'testing-fake-timers'],
    concept:
      'An Effect owns the interval and depends only on the delay; the callback is read from a ref (`useLatest`) on each tick.',
    problem:
      'An interval set up once reads the state from its first render (a stale closure), while putting the callback in the dependencies restarts the interval on every render.',
    whenToUse: ['Clocks, polling, carousels, countdown refreshes.'],
    whenNotToUse: [
      'Server data polling with caching/retries — TanStack Query `refetchInterval` or SWR `refreshInterval`.',
      'Animations — use `useAnimationFrame`.',
      'Elapsed-time displays: intervals drift and are throttled in background tabs; compute from `Date.now()` on each tick.',
    ],
    api: {
      signature: 'function useInterval(callback: () => void, delayMs: number | null): void',
      params: [
        { name: 'callback', type: '() => void', description: 'Latest version runs on each tick.' },
        { name: 'delayMs', type: 'number | null', description: '`null` pauses the interval.' },
      ],
      returns: 'Nothing.',
    },
    mistakes: [
      {
        title: 'Stale closure',
        wrong:
          'useEffect(() => {\n  const id = setInterval(() => setCount(count + step), 1000);\n  return () => clearInterval(id);\n}, []);',
        why: '`count` and `step` are frozen at their first-render values.',
        right: 'useInterval(() => setCount((c) => c + step), 1000);',
      },
    ],
    testing:
      'Fake-timer tests cover ticking, pausing with `null`, the latest callback without restarts, delay changes and unmount cleanup.',
  },
  {
    id: 'use-timeout',
    title: 'useTimeout',
    section: 'custom',
    category: 'Timing & scheduling',
    level: 'intermediate',
    summary:
      'Declarative `setTimeout` with reactive `isPending` and `start`/`reset`/`clear` controls.',
    tags: ['timeout', 'toast', 'auto dismiss', 'delay', 'timer'],
    demo: 'examples/custom-hooks/timing/UseTimeoutDemo.tsx',
    sources: ['hooks/timing/useTimeout.ts'],
    tests: [
      'hooks/timing/useTimeout.test.tsx',
      'examples/custom-hooks/timing/UseTimeoutDemo.test.tsx',
      SSR_TEST,
    ],
    minReact: '16.8',
    support: {
      level: 'universal',
      notes: 'On the server `isPending` reflects `autoStart`; no timer runs.',
    },
    officialDocs: [
      {
        label: 'Adjusting state when a prop changes',
        url: 'https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes',
      },
      {
        label: 'WCAG 2.2.1 Timing Adjustable',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html',
      },
    ],
    related: ['use-interval', 'use-debounced-callback'],
    concept:
      'The timer is described by state — `pending` plus a run counter — and scheduled by an Effect keyed on them. Controls only update state; delay changes use the "adjust state while rendering" pattern.',
    problem:
      'Imperative timeouts stored in refs leak on unmount, fire twice in Strict Mode, cannot be shown in the UI ("closing in…") and are easy to restart incorrectly.',
    whenToUse: [
      'Auto-dismissing toasts, delayed hints/tooltips, "undo" windows, session warnings.',
    ],
    whenNotToUse: [
      'Postponing work until input stops — that is debouncing (`useDebouncedCallback`).',
      'Sub-render precision — controls take effect after React re-renders.',
    ],
    api: {
      signature:
        'function useTimeout(callback: () => void, delayMs: number | null, options?: { autoStart?: boolean }): { isPending: boolean; start(): void; reset(): void; clear(): void }',
      params: [
        {
          name: 'callback',
          type: '() => void',
          description: 'Latest version runs when the timer fires.',
        },
        { name: 'delayMs', type: 'number | null', description: '`null` disables the timer.' },
        {
          name: 'options.autoStart',
          type: 'boolean',
          description: 'Start on mount and when the delay changes (default true).',
          optional: true,
        },
      ],
      returns:
        '`isPending` (reactive) and stable controls: `start` (if idle), `reset` (restart from now), `clear`.',
    },
    execution: [
      'Render: if `delayMs` changed, state is adjusted (pending if it was pending or `autoStart`; never pending with `null`).',
      'Effect (pending, run, delay): schedules one `setTimeout`; cleanup clears it.',
      'Fire: marks the run as finished and calls the latest callback.',
    ],
    edgeCases: [
      '`start()` while pending does nothing; use `reset()` to restart.',
      'A pending timer restarts from zero when the delay changes.',
    ],
    testing:
      'Fake-timer tests cover auto-start, manual start, clear/reset, `null`, delay changes, the latest callback and unmount cleanup; the demo test pauses a toast on hover.',
    production: [
      'Let users pause auto-dismissing content (hover/focus), as the demo does, and keep important messages until dismissed.',
    ],
  },
  {
    id: 'use-animation-frame',
    title: 'useAnimationFrame',
    section: 'custom',
    category: 'Timing & scheduling',
    level: 'intermediate',
    summary: 'A `requestAnimationFrame` loop with frame delta time, pause and cleanup.',
    tags: ['requestAnimationFrame', 'raf', 'animation', 'game loop', 'delta time', 'fps'],
    demo: 'examples/custom-hooks/timing/UseAnimationFrameDemo.tsx',
    sources: ['hooks/timing/useAnimationFrame.ts'],
    tests: [
      'hooks/timing/useAnimationFrame.test.tsx',
      'examples/custom-hooks/timing/UseAnimationFrameDemo.test.tsx',
      SSR_TEST,
    ],
    minReact: '16.8',
    support: {
      level: 'client-only',
      notes:
        'No-op on the server and without `requestAnimationFrame`; browsers pause rAF in background tabs.',
    },
    officialDocs: [
      {
        label: 'MDN: requestAnimationFrame',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame',
      },
      {
        label: 'MDN: prefers-reduced-motion',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion',
      },
    ],
    related: ['use-interval', 'use-throttle', 'use-media-query'],
    concept:
      'An Effect runs a rAF loop, passing `(deltaMs, timestamp)` to the latest callback. Pausing or unmounting cancels the pending frame; delta resets to 0 after a pause so paused time is not counted.',
    problem:
      'Hand-written loops forget `cancelAnimationFrame`, keep running after unmount, capture stale state, and move by a fixed amount per frame — so animations run faster on 120 Hz screens.',
    whenToUse: ['Canvas drawing, physics/game loops, measuring FPS, scrubbing timelines.'],
    whenNotToUse: [
      'Simple transitions — CSS transitions/animations or the Web Animations API run off the main thread.',
      'Updating React state every frame for large trees — mutate DOM nodes via refs and keep state for what the UI must know (as the demo does).',
    ],
    api: {
      signature:
        'function useAnimationFrame(callback: (deltaMs: number, timestamp: DOMHighResTimeStamp) => void, options?: { paused?: boolean }): void',
      params: [
        {
          name: 'callback',
          type: '(deltaMs, timestamp) => void',
          description: 'Runs every frame; latest version is used.',
        },
        {
          name: 'options.paused',
          type: 'boolean',
          description: 'Stops the loop while true.',
          optional: true,
        },
      ],
      returns: 'Nothing.',
    },
    edgeCases: [
      'If the callback synchronously unmounts the component, no further frame is requested.',
      'If the callback throws, the loop stops (the error is reported once instead of every frame).',
      'Respect `prefers-reduced-motion`: the demo starts paused when it is set.',
    ],
    testing:
      'Tests drive a manual rAF fake: delta values, pause/resume without counting paused time, latest callback, cancellation on unmount and the missing-API path.',
  },
  {
    id: 'use-idle',
    title: 'useIdle',
    section: 'custom',
    category: 'Timing & scheduling',
    level: 'intermediate',
    summary:
      'Detect when the user has been inactive for a timeout (activity events + `visibilitychange`).',
    tags: ['idle', 'inactivity', 'session timeout', 'auto logout', 'visibilitychange'],
    demo: 'examples/custom-hooks/timing/UseIdleDemo.tsx',
    sources: ['hooks/timing/useIdle.ts'],
    tests: [
      'hooks/timing/useIdle.test.tsx',
      'examples/custom-hooks/timing/UseIdleDemo.test.tsx',
      SSR_TEST,
    ],
    minReact: '16.8',
    support: {
      level: 'client-only',
      notes: 'Returns `initialState` on the server; listeners attach after hydration.',
    },
    officialDocs: [
      {
        label: 'MDN: visibilitychange',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event',
      },
      {
        label: 'MDN: Idle Detection API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Idle_Detection_API',
      },
    ],
    related: ['use-interval', 'use-event-listener', 'use-timeout'],
    concept:
      'Passive, capturing window listeners record the last activity timestamp; a single timer re-checks the elapsed time and flips `isIdle`. Returning to the tab (`visibilitychange` → visible) counts as activity.',
    problem:
      'Resetting a `setTimeout` (and re-rendering) on every `pointermove` is expensive, and forgetting cleanup leaves listeners attached to `window` forever.',
    whenToUse: [
      'Pausing polling or video when nobody is watching, "are you still there?" prompts, presence indicators.',
    ],
    whenNotToUse: [
      'Security-critical session expiry — enforce it on the server; client timers can be tampered with or throttled.',
      'System-wide idle state (other apps, screen lock) — that needs the permission-gated Idle Detection API (Chromium only).',
    ],
    api: {
      signature:
        'function useIdle(timeoutMs: number, options?: { events?: readonly string[]; initialState?: boolean; onIdle?: () => void; onActive?: () => void }): { isIdle: boolean; getLastActive: () => number }',
      params: [
        { name: 'timeoutMs', type: 'number', description: 'Inactivity before becoming idle.' },
        {
          name: 'options.events',
          type: 'readonly string[]',
          description:
            'Activity events (default pointer, key, wheel, touch, scroll). Compared by content.',
          optional: true,
        },
        {
          name: 'options.initialState',
          type: 'boolean',
          description: 'Idle state before any activity / on the server.',
          optional: true,
        },
        {
          name: 'options.onIdle / onActive',
          type: '() => void',
          description: 'Transition callbacks (latest version is used).',
          optional: true,
        },
      ],
      returns:
        '`isIdle` (reactive) and `getLastActive()` (a non-reactive timestamp for countdowns).',
    },
    edgeCases: [
      'Timers are throttled in background tabs; the elapsed-time check makes the result correct when the timer finally runs.',
      'Changing the timeout re-evaluates from the last activity; an idle user stays idle until the next activity.',
      'An inline `events` array does not re-subscribe on every render.',
    ],
    testing:
      'Fake-timer tests cover the timeout, activity postponing/waking, last activity time, custom events, `visibilitychange`, `initialState`, listener/timer cleanup and stable subscriptions.',
  },
  {
    id: 'use-long-press',
    title: 'useLongPress',
    section: 'custom',
    category: 'Timing & scheduling',
    level: 'intermediate',
    summary: 'Press-and-hold detection for pointer and keyboard, returned as props to spread.',
    tags: ['long press', 'hold', 'pointer events', 'touch', 'keyboard', 'confirm'],
    demo: 'examples/custom-hooks/timing/UseLongPressDemo.tsx',
    sources: ['hooks/timing/useLongPress.ts'],
    tests: [
      'hooks/timing/useLongPress.test.tsx',
      'examples/custom-hooks/timing/UseLongPressDemo.test.tsx',
      SSR_TEST,
    ],
    minReact: '16.8',
    support: { level: 'universal', notes: 'Uses Pointer Events (all modern browsers).' },
    officialDocs: [
      {
        label: 'MDN: Pointer events',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events',
      },
      {
        label: 'WCAG 2.5.1 Pointer Gestures',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html',
      },
    ],
    related: ['use-double-click', 'use-timeout', 'use-animation-frame'],
    concept:
      'Pointer down (primary button/touch/pen) or holding Space/Enter starts a timer; it fires `onLongPress` after `threshold` ms. Moving beyond `moveTolerance`, leaving, `pointercancel`, releasing early or blurring cancels.',
    problem:
      'Mouse/touch-only implementations exclude keyboard users, fire after the finger slid away to scroll, open the mobile context menu, and leak timers on unmount.',
    whenToUse: [
      'Hold-to-confirm destructive actions, revealing secondary actions on touch, press-and-hold repeat triggers.',
    ],
    whenNotToUse: [
      'As the only way to do something — WCAG 2.5.1 requires a single-pointer alternative; offer a menu or confirm dialog too.',
      'Drag gestures — use a gesture library (e.g. @use-gesture) that handles pointer capture and velocity.',
    ],
    api: {
      signature:
        'function useLongPress<T extends Element = Element>(onLongPress: (event: PointerEvent<T> | KeyboardEvent<T>) => void, options?: { threshold?: number; moveTolerance?: number; keyboard?: boolean; disabled?: boolean; onStart?; onCancel?; onFinish? }): LongPressHandlers<T>',
      params: [
        {
          name: 'onLongPress',
          type: '(event) => void',
          description: 'Called once when the threshold is reached.',
        },
        {
          name: 'options.threshold',
          type: 'number',
          description: 'Hold time in ms (default 500).',
          optional: true,
        },
        {
          name: 'options.moveTolerance',
          type: 'number',
          description: 'Pixels of movement allowed (default 10).',
          optional: true,
        },
        {
          name: 'options.keyboard',
          type: 'boolean',
          description: 'Support holding Space/Enter (default true).',
          optional: true,
        },
        {
          name: 'options.onStart / onCancel / onFinish',
          type: '(event) => void',
          description:
            'Lifecycle callbacks (cancel = released before the threshold, finish = released after).',
          optional: true,
        },
      ],
      returns:
        'Stable props: `onPointerDown/Move/Up/Leave/Cancel`, `onKeyDown/Up`, `onBlur`, `onContextMenu`.',
    },
    edgeCases: [
      'A short press still produces a normal `click`; keep the primary action on `onClick`.',
      'Key repeat (`event.repeat`) is ignored; only the key that started the press ends it.',
      'The context menu is suppressed only while a press is active.',
      'A new pointer down ends a press that never received its pointer up (e.g. the element was replaced).',
    ],
    testing:
      'Fake-timer tests cover the threshold, cancel on release/move/leave, movement tolerance, secondary buttons, disabled, Space/Enter with repeat, the context menu and unmount cleanup.',
    production: [
      'Add `touch-action`, `user-select: none` and `-webkit-touch-callout: none` to the target (see the demo CSS) and show progress feedback.',
    ],
  },
  {
    id: 'use-double-click',
    title: 'useDoubleClick',
    section: 'custom',
    category: 'Timing & scheduling',
    level: 'beginner',
    summary: 'Tell a single click from a double click on the same element.',
    tags: ['double click', 'dblclick', 'single click', 'file list', 'accessibility'],
    demo: 'examples/custom-hooks/timing/UseDoubleClickDemo.tsx',
    sources: ['hooks/timing/useDoubleClick.ts'],
    tests: [
      'hooks/timing/useDoubleClick.test.tsx',
      'examples/custom-hooks/timing/UseDoubleClickDemo.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'MDN: dblclick event',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Element/dblclick_event',
      },
    ],
    related: ['use-long-press', 'use-timeout'],
    concept:
      'The first click starts a `delay` timer; a second click before it fires cancels it and reports a double click, otherwise the timer reports a single click.',
    problem:
      'Native `click` fires before `dblclick`, so handling both runs the single-click action on every double click.',
    whenToUse: ['File managers, tables (select vs open), map markers.'],
    whenNotToUse: [
      'When the single-click action is harmless to run on a double click too — use native `onClick` + `onDoubleClick` and avoid the delay.',
      'As the only way to perform an action: double-click is hard or impossible for many users (motor impairments, touch, screen readers). Always provide a button, menu item or keyboard shortcut as well.',
    ],
    api: {
      signature:
        'function useDoubleClick<T extends Element = Element>(options: { onSingleClick?: (event: MouseEvent<T>) => void; onDoubleClick?: (event: MouseEvent<T>) => void; delay?: number }): { onClick: (event: MouseEvent<T>) => void; cancel: () => void }',
      params: [
        {
          name: 'options.onSingleClick',
          type: '(event) => void',
          description: 'Runs `delay` ms after a lone click.',
          optional: true,
        },
        {
          name: 'options.onDoubleClick',
          type: '(event) => void',
          description: 'Runs on the second click.',
          optional: true,
        },
        {
          name: 'options.delay',
          type: 'number',
          description: 'Window for the second click (default 250).',
          optional: true,
        },
      ],
      returns: 'A stable `onClick` handler and `cancel()`.',
    },
    edgeCases: [
      'Single clicks feel `delay` ms slower — keep the window short.',
      'Keyboard activation (Enter/Space) dispatches `click`, so two quick presses count as a double click.',
      'The fixed delay ignores the OS double-click speed setting.',
    ],
    testing:
      'Fake-timer tests cover single, double and slow clicks, the latest callbacks and unmount cleanup; the demo test opens a file both ways.',
  },
];
