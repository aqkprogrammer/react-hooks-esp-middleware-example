import { useId } from 'react';
import { Button, Panel, ValueTable } from '../../../components/ui';
import { useToggle } from '../../../hooks';

const THEMES = ['light', 'dark', 'system'] as const;

export default function UseToggleDemo() {
  const [notifications, toggleNotifications] = useToggle(true);
  const [theme, nextTheme, setTheme] = useToggle(THEMES);
  const groupId = useId();

  return (
    <div className="stack">
      <Panel title="Boolean switch" description="useToggle() with no list toggles a boolean.">
        <div className="row">
          <button
            type="button"
            role="switch"
            aria-checked={notifications}
            className="btn"
            onClick={toggleNotifications}
          >
            Notifications: {notifications ? 'on' : 'off'}
          </button>
        </div>
      </Panel>
      <Panel
        title="Cycling through values"
        description="useToggle(['light', 'dark', 'system']) — the type is the literal union."
      >
        <div className="row">
          <Button onClick={nextTheme}>Next theme</Button>
        </div>
        <fieldset className="stack">
          <legend id={groupId}>Jump straight to a value with setValue</legend>
          <div className="row">
            {THEMES.map((option) => (
              <label key={option} className="row">
                <input
                  type="radio"
                  name={groupId}
                  value={option}
                  checked={theme === option}
                  onChange={() => setTheme(option)}
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>
        <ValueTable label="Toggle state" rows={{ theme, notifications: String(notifications) }} />
      </Panel>
    </div>
  );
}
