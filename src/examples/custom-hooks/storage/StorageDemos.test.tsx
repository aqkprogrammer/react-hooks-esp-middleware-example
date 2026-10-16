import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { parseCookies } from '../../../hooks';
import { resetStorageAvailability } from '../../../hooks/storage/storageState';
import UseBroadcastChannelDemo from './UseBroadcastChannelDemo';
import UseCookieDemo from './UseCookieDemo';
import UseCrossTabStateDemo from './UseCrossTabStateDemo';
import UsePersistentStateDemo from './UsePersistentStateDemo';
import UseSessionStorageDemo from './UseSessionStorageDemo';

afterEach(() => {
  resetStorageAvailability();
  for (const name of Object.keys(parseCookies(document.cookie))) {
    document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0`;
  }
});

describe('UseSessionStorageDemo', () => {
  it('moves through steps and persists to sessionStorage', async () => {
    const user = userEvent.setup();
    render(<UseSessionStorageDemo />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: /Step 2 of 3: Payment/ })).toBeInTheDocument();
    expect(window.sessionStorage.getItem('playground:checkout:step')).toBe('1');
    await user.click(screen.getByRole('button', { name: 'Start over (remove keys)' }));
    expect(screen.getByRole('heading', { name: /Step 1 of 3/ })).toBeInTheDocument();
  });
});

describe('UseCookieDemo', () => {
  it('sets a cookie with options and removes it', async () => {
    const user = userEvent.setup();
    render(<UseCookieDemo />);
    const value = screen.getByLabelText('Value');
    await user.clear(value);
    await user.type(value, 'de-CH');
    await user.selectOptions(screen.getByLabelText('SameSite'), 'strict');
    await user.click(screen.getByRole('button', { name: 'Set cookie' }));
    expect(parseCookies(document.cookie).playground_locale).toBe('de-CH');
    expect(screen.getByText('"de-CH"')).toBeInTheDocument();
    expect(screen.getByText(/Set playground_locale=de-CH \(SameSite=strict\)/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove cookie' }));
    expect(parseCookies(document.cookie).playground_locale).toBeUndefined();
    expect(screen.getByText('null')).toBeInTheDocument();
  });
});

describe('UsePersistentStateDemo', () => {
  it('migrates seeded v1 data and ignores data from a newer version', async () => {
    const user = userEvent.setup();
    render(<UsePersistentStateDemo />);
    const prefs = () => screen.getByLabelText('Preferences');
    expect(within(prefs()).getByText('light')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Seed v1 envelope' }));
    expect(within(prefs()).getByText('dark')).toBeInTheDocument();
    expect(within(prefs()).getByText('14')).toBeInTheDocument();
    await waitFor(() =>
      expect(window.localStorage.getItem('playground:prefs')).toBe(
        '{"__v":2,"value":{"theme":"dark","fontSize":14}}',
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Seed v3 (newer release)' }));
    expect(within(prefs()).getByText('light')).toBeInTheDocument();
    expect(screen.getByText(/version: .*newer than 2/)).toBeInTheDocument();
  });
});

describe('UseBroadcastChannelDemo', () => {
  it('sends messages and logs them', async () => {
    const user = userEvent.setup();
    render(<UseBroadcastChannelDemo />);
    expect(screen.getByText('supported')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send chat' }));
    expect(screen.getByText('Sent chat')).toBeInTheDocument();
  });

  it('receives messages from another tab', async () => {
    render(<UseBroadcastChannelDemo />);
    const otherTab = new BroadcastChannel('playground:tabs');
    otherTab.postMessage({ type: 'chat', text: 'hi from tab 2', sentAt: 0 });
    expect(await screen.findByText(/Received chat: “hi from tab 2”/)).toBeInTheDocument();
    otherTab.close();
  });
});

describe('UseCrossTabStateDemo', () => {
  it('moves the live slide without persisting it', async () => {
    const user = userEvent.setup();
    render(<UseCrossTabStateDemo />);
    await user.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(screen.getByRole('heading', { name: 'Live slide: 2. Agenda' })).toBeInTheDocument();
    expect(window.localStorage.getItem('playground:slide')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Advance persisted slide' }));
    expect(window.localStorage.getItem('playground:slide-persisted')).toBe('1');
  });
});
