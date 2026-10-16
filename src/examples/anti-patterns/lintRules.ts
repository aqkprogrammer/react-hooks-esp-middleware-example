/**
 * The rules this project enables through
 * `eslint-plugin-react-hooks` 7 `recommended-latest` (see eslint.config.js),
 * with a minimal example of what each one reports. lintRules.test.ts checks
 * this list against the installed plugin's preset.
 */

export interface LintRule {
  /** Rule name without the `react-hooks/` prefix. */
  name: string;
  severity: 'error' | 'warn';
  /** Rules backed by the React Compiler's analysis (added in plugin v6/v7). */
  compilerPowered: boolean;
  catches: string;
  bad: string;
  good: string;
  docs: string;
}

const lintDocs = (name: string) =>
  `https://react.dev/reference/eslint-plugin-react-hooks/lints/${name}`;

export const lintRules: readonly LintRule[] = [
  {
    name: 'rules-of-hooks',
    severity: 'error',
    compilerPowered: false,
    catches:
      'Hooks called conditionally, in loops, after an early return, in callbacks, or outside components and custom Hooks.',
    bad: 'if (open) {\n  useEffect(subscribe);\n}',
    good: 'useEffect(() => {\n  if (open) return subscribe();\n}, [open]);',
    docs: lintDocs('rules-of-hooks'),
  },
  {
    name: 'exhaustive-deps',
    severity: 'warn',
    compilerPowered: false,
    catches:
      'Missing or unnecessary dependencies, and objects/functions that change on every render, in useEffect/useMemo/useCallback dependency arrays.',
    bad: 'useEffect(() => {\n  connect(roomId);\n}, []); // roomId missing',
    good: 'useEffect(() => {\n  connect(roomId);\n}, [roomId]);',
    docs: lintDocs('exhaustive-deps'),
  },
  {
    name: 'set-state-in-effect',
    severity: 'error',
    compilerPowered: true,
    catches:
      'setState called synchronously in an effect body — usually derived state that should be computed during render.',
    bad: 'useEffect(() => {\n  setFullName(first + " " + last);\n}, [first, last]);',
    good: 'const fullName = first + " " + last;',
    docs: lintDocs('set-state-in-effect'),
  },
  {
    name: 'set-state-in-render',
    severity: 'error',
    compilerPowered: true,
    catches:
      'Unconditional setState during render, which loops until React throws “Too many re-renders”.',
    bad: 'setCount(count + 1);\nreturn <p>{count}</p>;',
    good: 'return <button onClick={() => setCount(count + 1)}>{count}</button>;',
    docs: lintDocs('set-state-in-render'),
  },
  {
    name: 'refs',
    severity: 'error',
    compilerPowered: true,
    catches: 'Reading or writing ref.current during render.',
    bad: 'renders.current += 1;\nreturn <p>{renders.current}</p>;',
    good: 'useEffect(() => {\n  renders.current += 1;\n});',
    docs: lintDocs('refs'),
  },
  {
    name: 'purity',
    severity: 'error',
    compilerPowered: true,
    catches:
      'Known-impure calls during render such as Date.now(), Math.random() or performance.now().',
    bad: 'const id = Math.random();',
    good: 'const id = useId();',
    docs: lintDocs('purity'),
  },
  {
    name: 'immutability',
    severity: 'error',
    compilerPowered: true,
    catches: 'Assignments to props, state and other values React treats as immutable.',
    bad: 'filters.showDone = true;\nsetFilters(filters);',
    good: 'setFilters({ ...filters, showDone: true });',
    docs: lintDocs('immutability'),
  },
  {
    name: 'globals',
    severity: 'error',
    compilerPowered: true,
    catches: 'Assigning to or mutating module-level variables during render.',
    bad: 'let renderCount = 0;\nfunction Header() {\n  renderCount++;\n}',
    good: 'Keep per-instance values in state or refs; mutate in effects or handlers.',
    docs: lintDocs('globals'),
  },
  {
    name: 'static-components',
    severity: 'error',
    compilerPowered: true,
    catches:
      'Components defined inside other components (recreated — and remounted — on every render).',
    bad: 'function List() {\n  function Row() { … }\n  return <Row />;\n}',
    good: 'function Row() { … }\nfunction List() {\n  return <Row />;\n}',
    docs: lintDocs('static-components'),
  },
  {
    name: 'use-memo',
    severity: 'error',
    compilerPowered: true,
    catches: 'Common useMemo mistakes, e.g. async callbacks or callbacks that take arguments.',
    bad: 'const data = useMemo(async () => load(id), [id]);',
    good: 'Fetch in an effect, an event handler or a data library — not in useMemo.',
    docs: lintDocs('use-memo'),
  },
  {
    name: 'void-use-memo',
    severity: 'error',
    compilerPowered: true,
    catches:
      'useMemo callbacks that return nothing, or whose result is unused (useMemo used for side effects).',
    bad: 'useMemo(() => {\n  analytics.track(page);\n}, [page]);',
    good: 'useEffect(() => {\n  analytics.track(page);\n}, [page]);',
    docs: 'https://react.dev/reference/react/useMemo',
  },
  {
    name: 'preserve-manual-memoization',
    severity: 'error',
    compilerPowered: true,
    catches:
      'Manual useMemo/useCallback the compiler cannot preserve, typically because the dependency list is incomplete.',
    bad: 'const sorted = useMemo(() => sortBy(items, key), [items]); // key missing',
    good: 'const sorted = useMemo(() => sortBy(items, key), [items, key]);',
    docs: lintDocs('preserve-manual-memoization'),
  },
  {
    name: 'error-boundaries',
    severity: 'error',
    compilerPowered: true,
    catches: 'try/catch around JSX, which cannot catch errors thrown while rendering children.',
    bad: 'try {\n  return <Chart />;\n} catch {\n  return <Fallback />;\n}',
    good: '<ErrorBoundary fallback={<Fallback />}>\n  <Chart />\n</ErrorBoundary>',
    docs: lintDocs('error-boundaries'),
  },
  {
    name: 'incompatible-library',
    severity: 'warn',
    compilerPowered: true,
    catches:
      'APIs from libraries known to return values that are unsafe to memoise (manual or automatic).',
    bad: 'const { watch } = useForm();\nconst value = watch("name"); // interior mutability',
    good: 'Follow the library’s React Compiler guidance (e.g. a subscription hook such as useWatch).',
    docs: lintDocs('incompatible-library'),
  },
  {
    name: 'unsupported-syntax',
    severity: 'warn',
    compilerPowered: true,
    catches:
      'Syntax the compiler will not support inside components and Hooks, such as `eval` or `with`.',
    bad: 'const value = eval(expression);',
    good: 'Move dynamic code out of components, or avoid it entirely.',
    docs: lintDocs('unsupported-syntax'),
  },
  {
    name: 'config',
    severity: 'error',
    compilerPowered: true,
    catches:
      'Invalid React Compiler options. Only relevant when compiler options are configured; this project uses the defaults.',
    bad: "compilationMode: 'everything' // valid: 'infer' | 'syntax' | 'annotation' | 'all'",
    good: "compilationMode: 'infer'",
    docs: lintDocs('config'),
  },
  {
    name: 'gating',
    severity: 'error',
    compilerPowered: true,
    catches:
      'Invalid configuration of the compiler’s gating mode (feature-flagged compilation). Not configured in this project.',
    bad: "gating: { source: 'flags' } // importSpecifierName missing",
    good: "gating: { source: 'flags', importSpecifierName: 'isCompilerEnabled' }",
    docs: lintDocs('gating'),
  },
];
