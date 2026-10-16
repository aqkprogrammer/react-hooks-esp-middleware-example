import { useId, useState } from 'react';
import { Button, EventLog, Panel, useEventLog } from '../../../components/ui';
import { useAnnouncer, type Politeness } from '../../../hooks';

const PRODUCTS = ['Coffee beans', 'Grinder', 'Kettle'];

/**
 * Screen-reader announcements for changes that do not move focus. The log
 * mirrors what was announced, since sighted users cannot hear it.
 */
export default function UseAnnouncerDemo() {
  const { announce, clear } = useAnnouncer();
  const [cart, setCart] = useState<string[]>([]);
  const [message, setMessage] = useState('Draft saved');
  const [politeness, setPoliteness] = useState<Politeness>('polite');
  const messageId = useId();
  const { entries, log, clear: clearLog } = useEventLog();

  const say = (text: string, level: Politeness = 'polite') => {
    announce(text, { politeness: level });
    log(`[${level}] ${text}`, level === 'assertive' ? 'warn' : 'info');
  };

  return (
    <div className="stack">
      <Panel
        title="Shopping cart"
        description="Turn on a screen reader (VoiceOver, NVDA, TalkBack) and add items."
      >
        <ul className="list">
          {PRODUCTS.map((product) => (
            <li key={product} className="spread">
              <span>{product}</span>
              <Button
                size="sm"
                onClick={() => {
                  const next = [...cart, product];
                  setCart(next);
                  say(
                    `${product} added. Cart has ${next.length} ${next.length === 1 ? 'item' : 'items'}.`,
                  );
                }}
              >
                Add <span className="visually-hidden">{product}</span> to cart
              </Button>
            </li>
          ))}
        </ul>
        <div className="row">
          <span>Cart: {cart.length} items</span>
          <Button
            size="sm"
            variant="ghost"
            disabled={cart.length === 0}
            onClick={() => {
              setCart([]);
              say('Cart emptied.');
            }}
          >
            Empty cart
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => say('Payment failed: your card was declined.', 'assertive')}
          >
            Simulate payment error
          </Button>
        </div>
      </Panel>
      <Panel title="Custom announcement">
        <div className="field">
          <label htmlFor={messageId} className="field-label">
            Message
          </label>
          <input
            id={messageId}
            className="input"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>
        <fieldset className="row">
          <legend className="field-label">Politeness</legend>
          {(['polite', 'assertive'] as const).map((level) => (
            <label key={level} className="row">
              <input
                type="radio"
                name="announcer-politeness"
                checked={politeness === level}
                onChange={() => setPoliteness(level)}
              />
              {level}
            </label>
          ))}
        </fieldset>
        <div className="row">
          <Button
            variant="primary"
            disabled={!message.trim()}
            onClick={() => say(message, politeness)}
          >
            Announce
          </Button>
          <Button variant="ghost" onClick={clear}>
            Clear live regions
          </Button>
        </div>
      </Panel>
      <EventLog entries={entries} onClear={clearLog} title="Announced" />
    </div>
  );
}
