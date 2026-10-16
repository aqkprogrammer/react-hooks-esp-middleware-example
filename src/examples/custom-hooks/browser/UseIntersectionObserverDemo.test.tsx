import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { installIntersectionObserver } from '../../../test/browserMocks';
import UseIntersectionObserverDemo from './UseIntersectionObserverDemo';

describe('UseIntersectionObserverDemo', () => {
  it('lights up cards reported as intersecting the scroll container', () => {
    const Observer = installIntersectionObserver();
    render(<UseIntersectionObserverDemo />);
    const region = screen.getByRole('region', { name: 'Scrollable list of cards' });
    const live = Observer.instances.filter((observer) => !observer.disconnected);
    expect(live).toHaveLength(12);
    expect(live.every((observer) => observer.root === region)).toBe(true);
    expect(live[0]?.thresholds).toEqual([0.5]);

    const card = screen.getByTestId('card-2');
    Observer.triggerAll(card, true);
    expect(card).toHaveAttribute('data-visible', 'true');
    expect(within(card).getByText('visible')).toBeInTheDocument();
    expect(screen.getByText('1 of 12')).toBeInTheDocument();
  });

  it('re-creates observers with the chosen threshold and freezes when asked', async () => {
    const user = userEvent.setup();
    const Observer = installIntersectionObserver();
    render(<UseIntersectionObserverDemo />);
    await user.selectOptions(screen.getByLabelText('Threshold'), '1 (fully visible)');
    await user.click(screen.getByLabelText(/freezeOnceVisible/));
    const live = Observer.instances.filter((observer) => !observer.disconnected);
    expect(live).toHaveLength(12);
    expect(live[0]?.thresholds).toEqual([1]);

    const card = screen.getByTestId('card-1');
    Observer.triggerAll(card, true);
    expect(card).toHaveAttribute('data-visible', 'true');
    // Frozen: its observer is gone, the card stays "visible".
    expect(Observer.instances.filter((observer) => observer.elements.has(card))).toHaveLength(0);
  });

  it('explains when IntersectionObserver is unsupported', () => {
    render(<UseIntersectionObserverDemo />);
    expect(screen.getAllByText('IntersectionObserver is not supported')).toHaveLength(12);
  });
});
