import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installMatchMedia } from '../../../test/browserMocks';
import UseMediaQueryDemo from './UseMediaQueryDemo';

describe('UseMediaQueryDemo', () => {
  it('shows a live badge per query', () => {
    const media = installMatchMedia({ '(min-width: 768px)': true });
    render(<UseMediaQueryDemo />);
    expect(screen.getAllByText('matches')).toHaveLength(1);
    expect(screen.getAllByText('no match')).toHaveLength(5);
    media.setMatches('(hover: hover)', true);
    expect(screen.getAllByText('matches')).toHaveLength(2);
  });
});
