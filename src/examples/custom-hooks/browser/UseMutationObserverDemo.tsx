import { useRef, useState } from 'react';
import { Button, Callout, EventLog, Panel, useEventLog } from '../../../components/ui';
import { useMutationObserver } from '../../../hooks';

/**
 * A "third-party widget" container whose DOM is changed with plain DOM APIs
 * (React renders nothing inside it). The hook reports what changed.
 */
export default function UseMutationObserverDemo() {
  const widgetRef = useRef<HTMLUListElement>(null);
  const [childList, setChildList] = useState(true);
  const [attributes, setAttributes] = useState(true);
  const [characterData, setCharacterData] = useState(false);
  const { entries, log, clear } = useEventLog(30);
  const counter = useRef(0);

  const anyOption = childList || attributes || characterData;
  const { isSupported } = useMutationObserver(
    // `null` stops observing: observe() would throw with no option enabled.
    anyOption ? widgetRef : null,
    (records) => {
      for (const record of records) {
        if (record.type === 'childList') {
          log(`childList: +${record.addedNodes.length} / −${record.removedNodes.length} nodes`);
        } else if (record.type === 'attributes') {
          const value = (record.target as Element).getAttribute(record.attributeName ?? '');
          log(`attributes: ${record.attributeName} ${record.oldValue ?? '∅'} → ${value ?? '∅'}`);
        } else {
          log(`characterData: “${record.oldValue ?? ''}” → “${record.target.textContent ?? ''}”`);
        }
      }
    },
    {
      childList,
      attributes,
      attributeOldValue: attributes ? true : undefined,
      characterData,
      characterDataOldValue: characterData ? true : undefined,
      subtree: true,
    },
  );

  // These handlers play the role of a non-React script mutating the DOM.
  const widget = {
    add() {
      const list = widgetRef.current;
      if (!list) return;
      counter.current += 1;
      const item = document.createElement('li');
      item.textContent = `Item ${counter.current}`;
      list.append(item);
    },
    removeLast() {
      widgetRef.current?.lastElementChild?.remove();
    },
    toggleState() {
      const list = widgetRef.current;
      if (!list) return;
      list.dataset.state = list.dataset.state === 'busy' ? 'idle' : 'busy';
    },
    editFirst() {
      const text = widgetRef.current?.firstElementChild?.firstChild;
      if (text instanceof Text) text.appendData(' ✎');
    },
  };

  return (
    <div className="stack">
      <Panel
        title="Mutated outside React"
        description="Use the buttons to change the DOM directly."
      >
        <fieldset className="row">
          <legend className="small muted">Observe</legend>
          <label className="row">
            <input
              type="checkbox"
              checked={childList}
              onChange={(e) => setChildList(e.target.checked)}
            />
            childList
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={attributes}
              onChange={(e) => setAttributes(e.target.checked)}
            />
            attributes
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={characterData}
              onChange={(e) => setCharacterData(e.target.checked)}
            />
            characterData
          </label>
        </fieldset>
        <div className="row">
          <Button onClick={widget.add}>Append item</Button>
          <Button onClick={widget.removeLast}>Remove last item</Button>
          <Button onClick={widget.toggleState}>Toggle data-state</Button>
          <Button onClick={widget.editFirst}>Edit first item’s text</Button>
        </div>
        <ul ref={widgetRef} className="list" aria-label="Widget items" data-state="idle" />
        {!anyOption ? (
          <Callout tone="warn">Enable at least one option — nothing is observed right now.</Callout>
        ) : null}
        {isSupported ? null : <Callout tone="warn">MutationObserver is not supported.</Callout>}
        <EventLog entries={entries} onClear={clear} title="Mutation records" />
      </Panel>
      <Callout title="Not for React-rendered DOM">
        If React renders the DOM, you already know when it changes: derive from state instead of
        observing your own output.
      </Callout>
    </div>
  );
}
