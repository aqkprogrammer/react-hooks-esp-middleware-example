import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import LintRulesDemo from './LintRulesDemo';
import { lintRules } from './lintRules';

const ruleButtons = () => within(screen.getByRole('group', { name: 'Lint rules' }));

describe('LintRulesDemo', () => {
  it('lists every enabled rule and shows rules-of-hooks first', () => {
    render(<LintRulesDemo />);
    expect(ruleButtons().getAllByRole('button')).toHaveLength(lintRules.length);
    expect(screen.getByRole('heading', { name: 'react-hooks/rules-of-hooks' })).toBeInTheDocument();
    expect(screen.getByLabelText('Reported code')).toHaveTextContent('useEffect(subscribe)');
  });

  it('shows details for the selected rule', async () => {
    const user = userEvent.setup();
    render(<LintRulesDemo />);
    await user.click(ruleButtons().getByRole('button', { name: 'refs' }));
    expect(screen.getByRole('heading', { name: 'react-hooks/refs' })).toBeInTheDocument();
    expect(screen.getByText('compiler-powered')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rule documentation on react.dev' })).toHaveAttribute(
      'href',
      'https://react.dev/reference/eslint-plugin-react-hooks/lints/refs',
    );
  });

  it('filters to compiler-powered rules', async () => {
    const user = userEvent.setup();
    render(<LintRulesDemo />);
    await user.click(screen.getByLabelText('Only React Compiler-powered rules'));
    expect(ruleButtons().queryByRole('button', { name: 'rules-of-hooks' })).not.toBeInTheDocument();
    expect(ruleButtons().getAllByRole('button')).toHaveLength(lintRules.length - 2);
    // The selection falls back to the first visible rule.
    expect(
      screen.getByRole('heading', { name: 'react-hooks/set-state-in-effect' }),
    ).toBeInTheDocument();
  });
});
