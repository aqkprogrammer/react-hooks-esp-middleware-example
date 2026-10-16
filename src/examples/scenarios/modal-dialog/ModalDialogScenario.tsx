import { useId, useState } from 'react';
import { Button, Callout, EventLog, Panel, useEventLog } from '../../../components/ui';
import { useDialogState, useForm, useScrollLock, type FormRules } from '../../../hooks';
import './ModalDialogScenario.css';

interface Profile {
  name: string;
  email: string;
}

const rules: FormRules<Profile> = {
  name: { validate: (value) => (value.trim() ? null : 'Enter a name.') },
  email: {
    validate: (value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? null : 'Enter a valid email address.',
  },
};

const describe = (returnValue: string) =>
  returnValue === '' ? '"" (Escape)' : JSON.stringify(returnValue);

/**
 * A modal "Edit profile" dialog on a native `<dialog>` (via `useDialogState`)
 * with a nested "Discard changes?" confirmation. The browser provides the
 * top layer, inert background, Escape handling and the layer order; the
 * hook keeps React in sync and restores focus to the trigger.
 */
export default function ModalDialogScenario() {
  const [profile, setProfile] = useState<Profile>({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
  });
  const { entries, log, clear } = useEventLog(20);
  const confirmMessageId = useId();

  const {
    dialogProps: editorProps,
    titleId: editorTitleId,
    open: openEditor,
    close: closeEditor,
    isOpen: editorOpen,
    returnValue: editorResult,
  } = useDialogState({
    onClose: (value) => log(`edit dialog closed with returnValue ${describe(value)}`),
  });

  const {
    dialogProps: confirmProps,
    titleId: confirmTitleId,
    open: openConfirm,
  } = useDialogState({
    onClose: (value) => {
      log(`confirm dialog closed with returnValue ${describe(value)}`);
      if (value === 'discard') closeEditor('discard');
    },
  });

  // Native modal dialogs do not stop the page behind them from scrolling.
  useScrollLock(editorOpen);

  const form = useForm<Profile>({ initialValues: profile, rules });
  const { register, errors, getFieldIds, focusField, isDirty } = form;

  // `returnValue` survives between openings and closing with Escape does not
  // change it, so clear it first — otherwise Escape reports the previous result.
  const resetReturnValue = (dialog: HTMLDialogElement | null) => {
    if (dialog) dialog.returnValue = '';
  };

  const startEditing = () => {
    form.reset(profile);
    resetReturnValue(editorProps.ref.current);
    openEditor();
    // showModal() focuses the first focusable element; the name field is
    // the most useful start here.
    focusField('name');
  };

  const askToDiscard = () => {
    resetReturnValue(confirmProps.ref.current);
    openConfirm();
  };

  const requestCancel = () => {
    if (isDirty) askToDiscard();
    else closeEditor('cancel');
  };

  const save = form.handleSubmit((values) => {
    setProfile({ name: values.name.trim(), email: values.email.trim() });
    closeEditor('save');
  });

  const nameIds = getFieldIds('name');
  const emailIds = getFieldIds('email');

  return (
    <div className="stack">
      <Panel
        title="Your profile"
        description="Edit opens a modal <dialog>. Change something, then press Escape: a nested confirmation opens, and only that topmost dialog reacts to the next Escape."
      >
        <dl className="modal-dialog-profile">
          <div>
            <dt>Name</dt>
            <dd>{profile.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{profile.email}</dd>
          </div>
        </dl>
        <div className="row">
          <Button variant="primary" onClick={startEditing}>
            Edit profile
          </Button>
          <span className="muted small">
            Last result: {editorResult === undefined ? '—' : describe(editorResult)}
          </span>
        </div>
      </Panel>

      <Callout title="What the browser does for a modal <dialog>">
        <code>showModal()</code> moves focus into the dialog, puts it in the top layer and makes the
        rest of the page <strong>inert</strong> — it cannot be clicked, focused or read by screen
        readers, so Tab can only reach the dialog (and the browser’s own UI, which is correct: users
        must be able to reach the address bar). Escape fires <code>cancel</code> on the{' '}
        <em>topmost</em> modal only. <code>useDialogState</code> restores focus to the trigger on
        close and keeps <code>isOpen</code> in sync however the dialog closed.
      </Callout>
      <EventLog entries={entries} onClear={clear} />

      <dialog
        {...editorProps}
        className="modal-dialog"
        onCancel={(event) => {
          editorProps.onCancel(event);
          // Escape with unsaved changes: ask first instead of closing.
          if (!event.defaultPrevented && isDirty) {
            event.preventDefault();
            askToDiscard();
          }
        }}
      >
        <form noValidate className="stack" onSubmit={(event) => void save(event)}>
          <h3 id={editorTitleId} className="modal-dialog-title">
            Edit profile
          </h3>
          <div className="field">
            <label htmlFor={nameIds.id} className="field-label">
              Name
            </label>
            <input {...register('name')} className="input" autoComplete="name" />
            {errors.name ? (
              <p id={nameIds.errorId} className="field-error">
                {errors.name}
              </p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor={emailIds.id} className="field-label">
              Email
            </label>
            <input {...register('email')} className="input" type="email" autoComplete="email" />
            {errors.email ? (
              <p id={emailIds.errorId} className="field-error">
                {errors.email}
              </p>
            ) : null}
          </div>
          <div className="row modal-dialog-actions">
            <Button onClick={requestCancel}>Cancel</Button>
            <Button type="submit" variant="primary">
              Save changes
            </Button>
          </div>
        </form>
      </dialog>

      {/* A sibling, not a child: each modal is its own top-layer entry. */}
      <dialog
        {...confirmProps}
        className="modal-dialog modal-dialog-confirm"
        role="alertdialog"
        aria-describedby={confirmMessageId}
      >
        <form method="dialog" className="stack">
          <h3 id={confirmTitleId} className="modal-dialog-title">
            Discard unsaved changes?
          </h3>
          <p id={confirmMessageId} className="muted">
            Your edits to the profile will be lost.
          </p>
          <div className="row modal-dialog-actions">
            {/* First in DOM order = initial focus: the least destructive choice. */}
            <Button type="submit" value="keep">
              Keep editing
            </Button>
            <Button type="submit" value="discard" variant="danger">
              Discard changes
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
