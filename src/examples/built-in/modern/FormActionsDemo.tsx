import { useId, useState } from 'react';
import { Badge, Button, Callout, Panel, TextField } from '../../../components/ui';

interface Comment {
  id: number;
  text: string;
  visibility: string;
}

let nextId = 1;

/**
 * In React 19 `<form action={fn}>` calls `fn(formData)` inside a transition
 * when the form is submitted. A submit button can override it with
 * `formAction`. After the action finishes successfully React resets the form,
 * so uncontrolled fields clear themselves.
 */
export default function FormActionsDemo() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [drafts, setDrafts] = useState<Comment[]>([]);
  const [rejected, setRejected] = useState<string | null>(null);
  const visibilityId = useId();

  const readComment = (formData: FormData): Comment => ({
    id: nextId++,
    text: String(formData.get('text') ?? '').trim(),
    visibility: String(formData.get('visibility') ?? 'public'),
  });

  // Actions may be synchronous; React still runs them as a transition.
  function postAction(formData: FormData) {
    const comment = readComment(formData);
    if (!comment.text) {
      setRejected('Write something before posting.');
      return;
    }
    setRejected(null);
    setComments((current) => [comment, ...current]);
  }

  function saveDraftAction(formData: FormData) {
    const draft = readComment(formData);
    if (draft.text) setDrafts((current) => [draft, ...current]);
  }

  return (
    <div className="stack">
      <Panel
        title="Comment form"
        description="No onSubmit, no preventDefault, no controlled inputs."
      >
        <form action={postAction} className="stack">
          <TextField label="Comment" name="text" placeholder="Say something nice" />
          <div className="row">
            <label htmlFor={visibilityId}>Visibility</label>
            <select id={visibilityId} name="visibility" defaultValue="public">
              <option value="public">public</option>
              <option value="team">team</option>
            </select>
          </div>
          <div className="row">
            <Button type="submit" variant="primary">
              Post
            </Button>
            <Button type="submit" formAction={saveDraftAction}>
              Save draft
            </Button>
          </div>
          {rejected ? (
            <p role="alert" className="field-error">
              {rejected}
            </p>
          ) : null}
        </form>
      </Panel>
      <div className="grid">
        <Panel title={`Posted (${comments.length})`}>
          <ul className="list" aria-label="Posted comments">
            {comments.map((comment) => (
              <li key={comment.id} className="spread">
                {comment.text} <Badge tone="info">{comment.visibility}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={`Drafts (${drafts.length})`}>
          <ul className="list" aria-label="Drafts">
            {drafts.map((draft) => (
              <li key={draft.id}>{draft.text}</li>
            ))}
          </ul>
        </Panel>
      </div>
      <Callout tone="warn" title="The automatic reset also clears rejected input">
        The reset happens whenever the action completes without throwing — including the “empty
        comment” early return above. To keep what the user typed after a validation error, return it
        from <code>useActionState</code> and feed it back as <code>defaultValue</code>, or use
        controlled inputs.
      </Callout>
    </div>
  );
}
