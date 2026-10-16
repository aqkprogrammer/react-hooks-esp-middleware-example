import { useState } from 'react';
import {
  Badge,
  Button,
  Callout,
  EventLog,
  Panel,
  TextField,
  ValueTable,
  show,
  useEventLog,
} from '../../../components/ui';
import { useBroadcastChannel } from '../../../hooks';

type TabMessage =
  | { type: 'chat'; text: string; sentAt: number }
  | { type: 'logout' }
  | { type: 'theme'; theme: 'light' | 'dark' };

const isTabMessage = (data: unknown): data is TabMessage => {
  if (typeof data !== 'object' || data === null) return false;
  const message = data as { type?: unknown; text?: unknown; theme?: unknown };
  return (
    (message.type === 'chat' && typeof message.text === 'string') ||
    message.type === 'logout' ||
    (message.type === 'theme' && (message.theme === 'light' || message.theme === 'dark'))
  );
};

/** Open this page in two tabs and send messages between them. */
export default function UseBroadcastChannelDemo() {
  const { entries, log, clear } = useEventLog();
  const [text, setText] = useState('Hello from another tab');
  const { isSupported, postMessage, lastMessage } = useBroadcastChannel<TabMessage>(
    'playground:tabs',
    {
      validate: isTabMessage,
      onMessage: (message) => {
        if (message.type === 'chat') log(`Received chat: “${message.text}”`, 'success');
        if (message.type === 'logout')
          log('Received logout — a real app would sign out here', 'warn');
        if (message.type === 'theme') log(`Received theme change: ${message.theme}`);
      },
      onError: (error) => log(error.message, 'error'),
    },
  );

  const send = (message: TabMessage, label: string) => {
    if (postMessage(message)) log(`Sent ${label}`);
    else log(`Could not send ${label}`, 'error');
  };

  return (
    <div className="stack">
      <Panel
        title="Send to other tabs"
        description="The sending tab never receives its own message — open a second tab to see them arrive."
      >
        <p>
          BroadcastChannel:{' '}
          <Badge tone={isSupported ? 'success' : 'warn'}>
            {isSupported ? 'supported' : 'not supported'}
          </Badge>
        </p>
        <TextField label="Message" value={text} onChange={(event) => setText(event.target.value)} />
        <div className="row">
          <Button
            variant="primary"
            disabled={!isSupported || text.trim() === ''}
            onClick={() => send({ type: 'chat', text, sentAt: Date.now() }, 'chat')}
          >
            Send chat
          </Button>
          <Button
            disabled={!isSupported}
            onClick={() => send({ type: 'theme', theme: 'dark' }, 'theme')}
          >
            Broadcast theme: dark
          </Button>
          <Button
            variant="danger"
            disabled={!isSupported}
            onClick={() => send({ type: 'logout' }, 'logout')}
          >
            Broadcast logout
          </Button>
        </div>
      </Panel>
      <Panel title="Received">
        <ValueTable label="Last message" rows={{ lastMessage: show(lastMessage) }} />
        <EventLog entries={entries} onClear={clear} />
      </Panel>
      <Callout title="Good to know">
        Messages are structured-cloned (Maps and Dates work, functions do not), are not persisted,
        and reach every same-origin tab — validate them and never send secrets.
      </Callout>
    </div>
  );
}
