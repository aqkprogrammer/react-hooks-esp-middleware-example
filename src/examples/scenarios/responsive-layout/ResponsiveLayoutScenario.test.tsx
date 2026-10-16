import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { installMatchMedia, installResizeObserver } from '../../../test/browserMocks';
import { modeForViewport, modeForWidth } from './layoutRules';
import ResponsiveLayoutScenario from './ResponsiveLayoutScenario';

const container = () => screen.getByRole('region', { name: 'Settings preview' });
const layout = () => screen.getByText('Layout').nextSibling?.textContent;

describe('layout rules', () => {
  it('maps widths and media queries to layouts', () => {
    expect(modeForWidth(900)).toBe('sidebar');
    expect(modeForWidth(500)).toBe('tabs');
    expect(modeForWidth(0)).toBe('stacked');
    expect(modeForViewport({ sidebar: false, tabs: true })).toBe('tabs');
  });
});

describe('ResponsiveLayoutScenario', () => {
  it('follows the container width, independently of the viewport', () => {
    const RO = installResizeObserver();
    installMatchMedia({ '(min-width: 1024px)': true, '(min-width: 640px)': true });
    render(<ResponsiveLayoutScenario />);
    // Not measured yet: mobile-first stacked layout.
    expect(layout()).toBe('stacked');
    RO.resizeAll(container(), 800, 400);
    expect(layout()).toBe('sidebar');
    expect(screen.getByRole('navigation', { name: 'Settings sections' })).toBeInTheDocument();
    RO.resizeAll(container(), 500, 400);
    expect(screen.getByRole('tablist', { name: 'Settings sections' })).toBeInTheDocument();
    RO.resizeAll(container(), 320, 400);
    expect(layout()).toBe('stacked');
    expect(screen.getByRole('heading', { name: 'Privacy' })).toBeInTheDocument();
  });

  it('follows the viewport media queries when asked to', async () => {
    const user = userEvent.setup();
    installResizeObserver();
    const media = installMatchMedia({ '(min-width: 1024px)': false, '(min-width: 640px)': true });
    render(<ResponsiveLayoutScenario />);
    await user.click(screen.getByRole('radio', { name: /Viewport width/ }));
    expect(layout()).toBe('tabs');
    media.setMatches('(min-width: 1024px)', true);
    expect(layout()).toBe('sidebar');
    expect(screen.getByText('Layout decided by').nextSibling).toHaveTextContent('viewport');
  });

  it('keeps the selected section across layouts and supports arrow keys in tabs', async () => {
    const user = userEvent.setup();
    const RO = installResizeObserver();
    installMatchMedia();
    render(<ResponsiveLayoutScenario />);
    RO.resizeAll(container(), 500, 400);
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    tabs[0]?.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Notifications' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Notifications' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('push notification');

    RO.resizeAll(container(), 800, 400);
    expect(screen.getByRole('button', { name: 'Notifications' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Privacy' }));
    RO.resizeAll(container(), 500, 400);
    expect(screen.getByRole('tab', { name: 'Privacy' })).toHaveAttribute('aria-selected', 'true');
  });

  it('constrains the container with the slider', () => {
    installResizeObserver();
    installMatchMedia();
    render(<ResponsiveLayoutScenario />);
    fireEvent.change(screen.getByLabelText(/Container max width/), { target: { value: '400' } });
    expect(container()).toHaveStyle({ maxWidth: '400px' });
    expect(screen.getByLabelText(/Container max width/)).toHaveAccessibleName(
      'Container max width: 400px',
    );
  });

  it('falls back to the viewport without ResizeObserver', () => {
    installMatchMedia({ '(min-width: 1024px)': true, '(min-width: 640px)': true });
    render(<ResponsiveLayoutScenario />);
    expect(screen.getByText('ResizeObserver unavailable')).toBeInTheDocument();
    expect(layout()).toBe('sidebar');
    expect(screen.getByText('Container (useElementSize)').nextSibling).toHaveTextContent('n/a');
  });
});
