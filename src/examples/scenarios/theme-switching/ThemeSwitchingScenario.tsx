import { useId } from 'react';
import { Badge, Button, Callout, Panel, ValueTable } from '../../../components/ui';
import { useLocalStorage, usePreferredColorScheme, useReducedMotion } from '../../../hooks';
import { isThemeChoice, resolveTheme, THEME_STORAGE_KEY, type ThemeChoice } from './theme';
import './ThemeSwitchingScenario.css';

const CHOICES: ReadonlyArray<{ value: ThemeChoice; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

/**
 * Light / dark / system theme for a *scoped* container: the choice persists
 * in localStorage (validated, synced across tabs), "system" follows
 * `prefers-color-scheme` live, and the cross-fade is turned off for users
 * who prefer reduced motion. The playground's own theme is never touched.
 */
export default function ThemeSwitchingScenario() {
  const groupId = useId();
  const [choice, setChoice] = useLocalStorage<ThemeChoice>(THEME_STORAGE_KEY, 'system', {
    validate: isThemeChoice,
  });
  const system = usePreferredColorScheme();
  const reducedMotion = useReducedMotion();
  const theme = resolveTheme(choice, system);

  return (
    <div className="stack">
      <Panel title="Theme" description="Saved in localStorage; other tabs follow along.">
        <fieldset className="theme-switching-choices" aria-describedby={`${groupId}-hint`}>
          <legend className="field-label">Colour theme</legend>
          {CHOICES.map((option) => (
            <label key={option.value} className="theme-switching-choice">
              <input
                type="radio"
                name={groupId}
                value={option.value}
                checked={choice === option.value}
                onChange={() => setChoice(option.value)}
              />
              {option.label}
              {option.value === 'system' && system !== 'no-preference' ? (
                <span className="muted small"> (currently {system})</span>
              ) : null}
            </label>
          ))}
        </fieldset>
        <p id={`${groupId}-hint`} className="field-hint">
          “System” follows your operating system and updates live when it changes.
        </p>
        {system === 'no-preference' ? (
          <Callout tone="warn" title="System preference unknown">
            This environment cannot report <code>prefers-color-scheme</code>, so “System” uses the
            light theme.
          </Callout>
        ) : null}
        <ValueTable
          label="Theme state"
          rows={{
            'stored choice': choice,
            'OS preference': system,
            'applied theme': theme,
            transitions: reducedMotion ? 'off (prefers-reduced-motion)' : 'cross-fade 400 ms',
          }}
        />
      </Panel>

      <Panel title="Preview" description="Only this container is themed.">
        <div
          className="theme-switching-preview"
          data-testid="theme-preview"
          data-preview-theme={theme}
          data-motion={reducedMotion ? 'reduce' : 'full'}
        >
          <div className="theme-switching-preview-card">
            <div className="spread">
              <h4 className="theme-switching-preview-title">Weekly report</h4>
              <Badge>{theme} theme</Badge>
            </div>
            <p className="theme-switching-preview-text">
              Signups are up 12% on last week. Secondary text uses the muted token, borders and
              surfaces their own tokens, so every colour switches together.
            </p>
            <Button
              variant="primary"
              className="theme-switching-preview-button"
              onClick={() => setChoice(theme === 'dark' ? 'light' : 'dark')}
            >
              Switch to {theme === 'dark' ? 'light' : 'dark'}
            </Button>
          </div>
        </div>
      </Panel>

      <Callout title="Theming a whole app">
        Put the class or <code>data-theme</code> on <code>{'<html>'}</code> and set it from a tiny
        inline script before React loads, so a stored “dark” never flashes light first. Use CSS
        <code> color-scheme</code> so form controls and scrollbars match.
      </Callout>
    </div>
  );
}
