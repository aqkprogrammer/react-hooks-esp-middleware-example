import cn from 'classnames';
import type { FormEvent } from 'react';
import { resetForm } from '../../common/form';
import useFormField from '../../common/hooks/useFormField';
import useKeyPress from '../../common/hooks/useKeyPress';
import { deleteKey, insertKey } from '../../common/keys';
import { types as commonTypes } from '../../common/types/types';
import { useWorkspace } from '../../context/context';
import { useAccumulators } from './context/context';
import './styles.css';

export function AccumulatorsTile() {
  const { state: workspaceState } = useWorkspace();
  const { state, actions, esp } = useAccumulators();
  const { accumulatorList, notice, lastEspEvents } = state;
  const form = {
    accumulator: useFormField(state.accumulatorInput, (value) => {
      actions.typingAccumulator(value);
    }),
  };
  const addDisabled = form.accumulator.isEmpty;
  const loggedIn = !!workspaceState.userToken;
  const tileClassName = cn('accumulatorsTile', workspaceState.themeClassName, { loggedIn });

  const onAddAccumulatorIfNotInList = (event: FormEvent) => {
    event.preventDefault();
    actions.addAccumulatorIfNotInList(form.accumulator.value);
    resetForm(form);
  };

  // Broadcast: every model observing KEY_PRESSED (this tile AND the price tile) receives it.
  const broadcastInsert = () => esp.broadcast(commonTypes.KEY_PRESSED, { key: insertKey });
  // Publish: only this tile's model receives it.
  const publishDelete = () => esp.publish(commonTypes.KEY_PRESSED, { key: deleteKey });

  // Wire up the keyboard too. Delete is ignored while typing so it can still edit text.
  useKeyPress(insertKey, broadcastInsert);
  useKeyPress(deleteKey, publishDelete, { ignoreWhenEditing: true });

  return (
    <article className={tileClassName} aria-labelledby="accumulators-tile-title">
      <h3 id="accumulators-tile-title">Accumulators Tile {loggedIn && <span>Logged In</span>}</h3>
      <form className="accumulatorsForm" onSubmit={onAddAccumulatorIfNotInList}>
        <fieldset>
          <p>
            Press <kbd>Insert</kbd> or <kbd>Delete</kbd>, or use these buttons, to send the events
            through the ESP router so they come back in as reducer actions. Insert needs a value in
            the input below.
          </p>
          <button type="button" onClick={broadcastInsert} disabled={addDisabled}>
            Insert (Broadcast)
          </button>
          <button type="button" onClick={publishDelete} disabled={!accumulatorList.length}>
            Delete (Publish)
          </button>
        </fieldset>
        <fieldset>
          <label htmlFor="accumulator-input">Accumulator</label>{' '}
          <input id="accumulator-input" name="accumulator" {...form.accumulator.bind} />
          <button type="submit" disabled={addDisabled}>
            Add Accumulator <span className="keyIndicator">(Insert Key)</span>
          </button>
          {notice ? (
            <p role="status" className="accumulatorNotice">
              {notice}{' '}
              <button type="button" onClick={actions.dismissNotice}>
                Dismiss
              </button>
            </p>
          ) : null}
        </fieldset>
      </form>
      <section className="accumulatorList" aria-labelledby="accumulator-list-title">
        <h4 id="accumulator-list-title">Accumulator List: {accumulatorList.length}</h4>
        <ul>
          {accumulatorList.map((accumulator, idx) => (
            <li key={accumulator}>
              {accumulator}
              <button type="button" onClick={() => actions.removeAccumulator(accumulator)}>
                Remove <span className="visually-hidden">{accumulator}</span>
                {idx === 0 && <span className="keyIndicator"> (Delete Key)</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="accumulatorsFooter" aria-label="ESP events received">
        <p>
          Last dispatch loop (postProcess): <code>{lastEspEvents.join(', ') || '—'}</code>
        </p>
        <p className="small">
          The original demo asked you to refresh the page when tiles stopped responding. That was
          caused by registering a new esp-js model on every render; models are now registered once
          in an effect and removed on unmount.
        </p>
      </section>
    </article>
  );
}
