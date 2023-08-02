import * as React from "react";
import { useContext } from "react";
import cn from "classnames";
import { WorkspaceContext } from "../../context/context";
import { AccumulatorsContext } from "./context/context";
import { types } from "./context/types";
import { insertKey, deleteKey } from "../../common/keys";
import useFormField from "../../common/hooks/useFormField";
import useKeyPress from "../../common/hooks/useKeyPress";
import { resetForm } from "../../common/form";
import "./styles.css";

export function AccumulatorsTile() {
  const { state: workspaceState } = useContext(WorkspaceContext);
  const { state, actions } = useContext(AccumulatorsContext);
  const { accumulatorList } = state;
  const form = {
    accumulator: useFormField(state.accumulatorInput, value => {
      actions.typingAccumulator(value);
    })
  };
  const addDisabled = form.accumulator.isEmpty;
  const loggedIn = !!workspaceState.userToken;
  const tileClassName = cn("accumulatorsTile", workspaceState.themeClassName, {
    loggedIn
  });

  const onAddAccumulatorIfNotInList = event => {
    event.preventDefault();
    actions.addAccumulatorIfNotInList(form.accumulator.value);
    resetForm(form);
  };

  const onInsertPressed = event => {
    event && event.preventDefault();
    actions.espBroadcast(types.common.KEY_PRESSED, { key: insertKey });
  };

  const onDeletePressed = event => {
    event && event.preventDefault();
    actions.espPublish(types.common.KEY_PRESSED, { key: deleteKey });
  };

  /**
   * Wire up keyboard too
   */
  useKeyPress(insertKey, () =>
    actions.espBroadcast(types.common.KEY_PRESSED, { key: insertKey })
  ); // broadcast test

  useKeyPress(deleteKey, () =>
    actions.espPublish(types.common.KEY_PRESSED, { key: deleteKey })
  ); // publish test

  return (
    <div className={tileClassName}>
      <h1>Accumulators Tile {loggedIn && <span>Logged In</span>}</h1>
      <form className="accumulatorsForm">
        <fieldset>
          <p>
            Press Insert or Delete key OR these buttons to publish the events on
            the ESP router, so we can simulate them coming back in. You'll need
            to have a value in the input below to insert.
          </p>
          <button
            type="button"
            onClick={onInsertPressed}
            disabled={addDisabled}
          >
            Insert (Broadcast)
          </button>
          <button
            type="button"
            onClick={onDeletePressed}
            disabled={!accumulatorList.length}
          >
            Delete (Publish)
          </button>
        </fieldset>
        <fieldset>
          <input name="accumulator" {...form.accumulator.bind} />
          <button
            type="submit"
            disabled={addDisabled}
            onClick={onAddAccumulatorIfNotInList}
          >
            Add Accumulator <span className="keyIndicator">(Insert Key)</span>
          </button>
          <p>
            We will act on Insert/Delete keys recieved back from the ESP router
            in the reducer.
          </p>
        </fieldset>
      </form>
      <section className="accumulatorList">
        <h3>Accumulator List: {accumulatorList.length}</h3>
        <ul>
          {accumulatorList.map((accumulator: string, idx: number) => (
            <li key={accumulator}>
              {accumulator}
              <button onClick={() => actions.removeAccumulator(accumulator)}>
                Remove
                {idx === 0 && (
                  <span className="keyIndicator"> (Delete Key)</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="accumulatorsFooter">
        <p>If buttons or keys stop functioning, or you see:</p>
        <p className="warn">
          Warning: Can't perform a React state update on an unmounted component
        </p>
        <p>
          Refresh the preview window to rectify. I think it's just hot reloading
          messing up the wiring, but need to debug.
        </p>
      </section>
    </div>
  );
}
