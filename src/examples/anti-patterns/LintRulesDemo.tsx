import { useState } from 'react';
import { Badge, Button, Callout, Panel } from '../../components/ui';
import { lintRules } from './lintRules';
import './antiPatterns.css';

/**
 * Explorer for the eslint-plugin-react-hooks rules this project runs
 * (`recommended-latest`): the two classic rules plus the React
 * Compiler-powered ones, with what each reports and the fix.
 */
export default function LintRulesDemo() {
  const [selectedName, setSelectedName] = useState('rules-of-hooks');
  const [compilerOnly, setCompilerOnly] = useState(false);
  const visible = lintRules.filter((rule) => !compilerOnly || rule.compilerPowered);
  const selected = visible.find((rule) => rule.name === selectedName) ?? visible[0];

  return (
    <div className="stack">
      <Panel
        title="Rules enabled in this project"
        description={`${lintRules.length} rules from eslint-plugin-react-hooks “recommended-latest”.`}
      >
        <label className="row small">
          <input
            type="checkbox"
            checked={compilerOnly}
            onChange={(event) => setCompilerOnly(event.target.checked)}
          />
          Only React Compiler-powered rules
        </label>
        <div className="row" role="group" aria-label="Lint rules">
          {visible.map((rule) => (
            <Button
              key={rule.name}
              size="sm"
              variant={rule.name === selected?.name ? 'primary' : 'secondary'}
              aria-pressed={rule.name === selected?.name}
              onClick={() => setSelectedName(rule.name)}
            >
              {rule.name}
            </Button>
          ))}
        </div>
      </Panel>
      {selected ? (
        <Panel title={`react-hooks/${selected.name}`}>
          <div className="row">
            <Badge tone={selected.severity === 'error' ? 'warn' : 'info'}>
              {selected.severity}
            </Badge>
            <Badge tone={selected.compilerPowered ? 'advanced' : 'beginner'}>
              {selected.compilerPowered ? 'compiler-powered' : 'classic rule'}
            </Badge>
          </div>
          <p>{selected.catches}</p>
          <div className="ap-columns">
            <div>
              <strong className="small">Reported</strong>
              <pre className="ap-code" aria-label="Reported code">
                <code>{selected.bad}</code>
              </pre>
            </div>
            <div>
              <strong className="small">Fix</strong>
              <pre className="ap-code" aria-label="Fixed code">
                <code>{selected.good}</code>
              </pre>
            </div>
          </div>
          <a href={selected.docs} target="_blank" rel="noreferrer">
            Rule documentation on react.dev
          </a>
        </Panel>
      ) : null}
      <Callout title="How detection works">
        <code>rules-of-hooks</code> and <code>exhaustive-deps</code> inspect the syntax tree: any
        call named <code>use…</code> must sit at the top level of a component (capitalised) or a
        Hook (<code>use</code> prefix). The compiler-powered rules run the React Compiler&apos;s
        analysis without compiling anything, so they understand data flow — which values come from
        props, state or refs, and what runs during render. Neither can see through values passed
        between your own functions, so tests still matter.
      </Callout>
    </div>
  );
}
