import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setDocumentVisibility } from '../../../test/browserMocks';
import UsePageVisibilityDemo from './UsePageVisibilityDemo';

afterEach(() => {
  vi.useRealTimers();
});

describe('UsePageVisibilityDemo', () => {
  it('counts only while the page is visible and logs changes', () => {
    vi.useFakeTimers();
    render(<UsePageVisibilityDemo />);
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText('3')).toBeInTheDocument();

    const restore = setDocumentVisibility('hidden');
    expect(screen.getByText('hidden')).toBeInTheDocument();
    expect(screen.getByText(/visibilitychange → hidden/)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('3')).toBeInTheDocument();
    restore();

    setDocumentVisibility('visible')();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
