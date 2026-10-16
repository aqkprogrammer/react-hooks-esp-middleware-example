import { useId, useState, type ReactNode } from 'react';
import { Button, Callout, Panel, ValueTable } from '../../../components/ui';
import { scopedRule, useScopedCss } from './useScopedCss';

type Tone = 'accent' | 'success' | 'warn' | 'danger';
const tones: readonly Tone[] = ['accent', 'success', 'warn', 'danger'];

function declarationsFor(tone: Tone, padding: number): string {
  return `border: 2px solid var(--${tone}); background: var(--${tone}-soft); padding: ${padding}px; border-radius: var(--radius-sm);`;
}

/**
 * A minimal CSS-in-JS hook: styles are generated from props, hashed into a
 * class name and injected with useInsertionEffect.
 */
export default function UseInsertionEffectDemo() {
  const [tone, setTone] = useState<Tone>('accent');
  const [padding, setPadding] = useState(12);
  const [boxes, setBoxes] = useState(1);
  const [styleTags, setStyleTags] = useState<string[] | null>(null);
  const toneId = useId();
  const paddingId = useId();

  const declarations = declarationsFor(tone, padding);
  const { className, rule } = scopedRule(declarations);

  return (
    <div className="stack">
      <Callout tone="warn" title="For CSS-in-JS library authors">
        Application code almost never needs <code>useInsertionEffect</code>. Use it only to inject{' '}
        <code>&lt;style&gt;</code> tags (or similar global resources) that must exist before layout
        effects read the DOM.
      </Callout>
      <Panel title="Styles generated from props">
        <div className="grid">
          <div className="field">
            <label className="field-label" htmlFor={toneId}>
              Tone
            </label>
            <select
              id={toneId}
              value={tone}
              onChange={(event) => setTone(event.target.value as Tone)}
            >
              {tones.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor={paddingId}>
              Padding: {padding}px
            </label>
            <input
              id={paddingId}
              type="range"
              min={4}
              max={32}
              step={4}
              value={padding}
              onChange={(event) => setPadding(Number(event.target.value))}
            />
          </div>
        </div>
        <ValueTable
          label="Generated style"
          rows={{ className, rule: <code className="small">{rule}</code> }}
        />
        <div className="row">
          <Button onClick={() => setBoxes((count) => count + 1)}>
            Add a box with the same style
          </Button>
          <Button
            onClick={() => setBoxes((count) => Math.max(0, count - 1))}
            disabled={boxes === 0}
          >
            Remove a box
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              setStyleTags(
                Array.from(
                  document.head.querySelectorAll('style[data-scoped-css]'),
                  (element) => element.getAttribute('data-scoped-css') ?? '',
                ),
              )
            }
          >
            Inspect &lt;head&gt;
          </Button>
        </div>
        <div className="grid">
          {Array.from({ length: boxes }, (_, index) => (
            <StyledBox key={index} declarations={declarations}>
              Box {index + 1}
            </StyledBox>
          ))}
        </div>
        {styleTags ? (
          <p className="small" role="status">
            {styleTags.length} injected &lt;style&gt; tag(s): {styleTags.join(', ') || 'none'}
          </p>
        ) : null}
      </Panel>
    </div>
  );
}

function StyledBox({ declarations, children }: { declarations: string; children: ReactNode }) {
  const className = useScopedCss(declarations);
  return <div className={className}>{children}</div>;
}
