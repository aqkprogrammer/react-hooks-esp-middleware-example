import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../../hooks/accessibility/testing/expectNoAxeViolations';
import { installMatchMedia, setDocumentVisibility } from '../../../test/browserMocks';
import NotificationsScenario from './NotificationsScenario';

const region = () => screen.getByRole('region', { name: 'Notifications' });
const stack = () => within(region()).getByRole('list');
const toastTitles = () =>
  within(stack())
    .queryAllByRole('listitem')
    .map((item) => item.querySelector('.toast-title')?.textContent);
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const live = (politeness: 'polite' | 'assertive') =>
  document.querySelector(`[data-live-announcer="${politeness}"]`);

describe('NotificationsScenario (timers)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a toast, announces it politely and auto-dismisses it', () => {
    render(<NotificationsScenario />);
    click('Save draft');
    expect(toastTitles()).toEqual(['Draft saved']);
    expect(within(stack()).getByText('Success')).toBeInTheDocument();
    advance(100);
    expect(live('polite')).toHaveTextContent('Draft saved.');
    expect(live('assertive')).toBeEmptyDOMElement();

    advance(4800);
    expect(toastTitles()).toEqual(['Draft saved']);
    advance(200);
    expect(toastTitles()).toEqual([]);
  });

  it('keeps errors until dismissed, announces them assertively and runs their action', () => {
    render(<NotificationsScenario />);
    click('Charge card');
    advance(100);
    expect(live('assertive')).toHaveTextContent('Payment failed. The card was declined.');
    advance(60_000);
    expect(toastTitles()).toEqual(['Payment failed']);

    click('Retry payment');
    expect(toastTitles()).toEqual(['Payment succeeded']);
    click('Dismiss: Payment succeeded');
    expect(toastTitles()).toEqual([]);
  });

  it('pauses the countdown while hovered and resumes with the remaining time', () => {
    render(<NotificationsScenario />);
    click('Save draft');
    advance(3000);
    fireEvent.pointerEnter(stack());
    expect(within(stack()).getByRole('listitem')).toHaveAttribute('data-paused', 'true');
    advance(20_000);
    expect(toastTitles()).toEqual(['Draft saved']);

    fireEvent.pointerLeave(stack());
    advance(1900);
    expect(toastTitles()).toEqual(['Draft saved']);
    advance(150);
    expect(toastTitles()).toEqual([]);
  });

  it('pauses while focus is inside the notifications and while the tab is hidden', () => {
    render(<NotificationsScenario />);
    click('Save draft');
    act(() => screen.getByRole('button', { name: 'Dismiss: Draft saved' }).focus());
    advance(20_000);
    expect(toastTitles()).toEqual(['Draft saved']);
    act(() => screen.getByRole('button', { name: 'Save draft' }).focus());

    const restore = setDocumentVisibility('hidden');
    advance(20_000);
    expect(toastTitles()).toEqual(['Draft saved']);
    restore();
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    advance(5000);
    expect(toastTitles()).toEqual([]);
  });

  it('limits the visible stack, queues the rest and batches their announcement', () => {
    render(<NotificationsScenario />);
    click('Receive 5 messages');
    expect(toastTitles()).toEqual([
      'Message 1 received',
      'Message 2 received',
      'Message 3 received',
    ]);
    expect(within(region()).getByText('2 more waiting')).toBeInTheDocument();
    advance(100);
    expect(live('polite')).toHaveTextContent(
      'Message 1 received. Message 2 received. Message 3 received.',
    );

    click('Dismiss: Message 1 received');
    expect(toastTitles()).toEqual([
      'Message 2 received',
      'Message 3 received',
      'Message 4 received',
    ]);
    advance(100);
    expect(live('polite')).toHaveTextContent('Message 4 received.');

    fireEvent.change(screen.getByLabelText('Max visible'), { target: { value: '5' } });
    expect(toastTitles()).toHaveLength(4);
    click('Dismiss all');
    expect(toastTitles()).toEqual([]);
    expect(region()).toHaveFocus();
  });

  it('dismisses the focused toast with Escape and moves focus to its neighbour', () => {
    render(<NotificationsScenario />);
    click('Save draft');
    click('Start sync');
    act(() => screen.getByRole('button', { name: 'Dismiss: Draft saved' }).focus());
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(toastTitles()).toEqual(['Sync started']);
    expect(screen.getByRole('button', { name: 'Dismiss: Sync started' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss: Sync started' }));
    expect(region()).toHaveFocus();
  });

  it('jumps to the notifications with Alt+T', () => {
    render(<NotificationsScenario />);
    click('Check storage');
    fireEvent.keyDown(window, { key: 't', code: 'KeyT', altKey: true });
    expect(screen.getByRole('button', { name: 'Dismiss: Storage almost full' })).toHaveFocus();
  });

  it('uses the duration setting for new toasts', () => {
    render(<NotificationsScenario />);
    fireEvent.change(screen.getByLabelText('Auto-dismiss after'), { target: { value: '10000' } });
    click('Save draft');
    advance(9000);
    expect(toastTitles()).toEqual(['Draft saved']);
    advance(1000);
    expect(toastTitles()).toEqual([]);
  });
});

describe('NotificationsScenario (motion and accessibility)', () => {
  it('drops the countdown bar and the slide animation for reduced motion', async () => {
    installMatchMedia({ '(prefers-reduced-motion: reduce)': true });
    const user = userEvent.setup();
    render(<NotificationsScenario />);
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(region()).toHaveAttribute('data-motion', 'reduce');
    expect(region().querySelector('.toast-countdown')).toBeNull();
  });

  it('draws the countdown with full motion', async () => {
    const user = userEvent.setup();
    render(<NotificationsScenario />);
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(region()).toHaveAttribute('data-motion', 'full');
    expect(region().querySelector('.toast-countdown')).not.toBeNull();
  });

  it('throws a helpful error when useToasts is used outside the provider', async () => {
    const { useToasts } = await import('./toastContext');
    function Orphan() {
      useToasts();
      return null;
    }
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow('useToasts must be used inside <ToastProvider>');
  });

  it('has no detectable accessibility violations with toasts shown', async () => {
    const user = userEvent.setup();
    const { container } = render(<NotificationsScenario />);
    await user.click(screen.getByRole('button', { name: 'Charge card' }));
    await user.click(screen.getByRole('button', { name: 'Receive 5 messages' }));
    await expectNoAxeViolations(container);
  });
});
