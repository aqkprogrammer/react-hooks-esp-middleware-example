import { Fragment, useCallback, useRef, useState, type FragmentInstance } from 'react';
import { Button, Callout, Panel, ValueTable } from '../../../components/ui';

const formatting = ['Bold', 'Italic', 'Underline', 'Strikethrough'] as const;

/**
 * A `ref` on `<Fragment>` (stable in React 19.3) gives a `FragmentInstance`
 * that acts on the Fragment's first-level DOM children — focus management
 * and event listeners for a group of siblings, with no wrapper element and
 * without the children having to forward refs.
 */
export default function FragmentRefDemo() {
  const groupRef = useRef<FragmentInstance>(null);
  const [clicks, setClicks] = useState(0);
  const [lastPressed, setLastPressed] = useState('—');

  // A ref callback with a cleanup function (React 19): attach the listener
  // when the Fragment mounts, detach it when it unmounts. useCallback keeps
  // the callback identity stable so React does not detach/re-attach on
  // every render.
  const setGroupRef = useCallback((instance: FragmentInstance) => {
    groupRef.current = instance;
    const onClick = (event: Event) => {
      setClicks((count) => count + 1);
      if (event.target instanceof HTMLElement) setLastPressed(event.target.textContent ?? '—');
    };
    instance.addEventListener('click', onClick);
    return () => {
      instance.removeEventListener('click', onClick);
      groupRef.current = null;
    };
  }, []);

  return (
    <div className="stack">
      <Panel
        title="Toolbar without a wrapper element"
        description="The buttons below are siblings rendered by a component that knows nothing about refs."
      >
        <div className="row" role="toolbar" aria-label="Formatting">
          <Fragment ref={setGroupRef}>
            <FormattingButtons />
          </Fragment>
        </div>
        <div className="row">
          <Button onClick={() => groupRef.current?.focus()}>Focus first in group</Button>
          <Button onClick={() => groupRef.current?.focusLast()}>Focus last in group</Button>
        </div>
        <ValueTable
          rows={{
            'Clicks seen by the Fragment listener': clicks,
            'Last pressed': lastPressed,
          }}
        />
      </Panel>
      <Callout title="What a FragmentInstance can do">
        <code>focus</code> / <code>focusLast</code> / <code>blur</code>,{' '}
        <code>addEventListener</code> / <code>removeEventListener</code> /{' '}
        <code>dispatchEvent</code>, <code>observeUsing</code> for Intersection/Resize observers,
        plus <code>getClientRects</code>, <code>getRootNode</code>,{' '}
        <code>compareDocumentPosition</code> and <code>scrollIntoView</code>. Use the explicit{' '}
        <code>&lt;Fragment&gt;</code> — the <code>&lt;&gt;</code> shorthand cannot take a ref.
      </Callout>
    </div>
  );
}

function FormattingButtons() {
  return (
    <>
      {formatting.map((label) => (
        <button key={label} type="button" className="btn btn-sm">
          {label}
        </button>
      ))}
    </>
  );
}
