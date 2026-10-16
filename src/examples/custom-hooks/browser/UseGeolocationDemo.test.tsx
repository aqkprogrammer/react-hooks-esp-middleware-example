import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { overrideProperty } from '../../../test/browserMocks';
import UseGeolocationDemo from './UseGeolocationDemo';

type Success = (position: GeolocationPosition) => void;
type Failure = (error: GeolocationPositionError) => void;

const restores: Array<() => void> = [];
afterEach(() => {
  while (restores.length) restores.pop()?.();
});

function installGeolocation() {
  const calls: Array<{ success: Success; failure: Failure }> = [];
  const geolocation = {
    getCurrentPosition: vi.fn((success: Success, failure: Failure) =>
      calls.push({ success, failure }),
    ),
    watchPosition: vi.fn((success: Success, failure: Failure) => calls.push({ success, failure })),
    clearWatch: vi.fn(),
  };
  restores.push(overrideProperty(navigator, 'geolocation', geolocation));
  return { geolocation, calls };
}

const position = {
  coords: { latitude: 52.37403, longitude: 4.88969, accuracy: 35.4 },
  timestamp: Date.now(),
} as unknown as GeolocationPosition;

describe('UseGeolocationDemo', () => {
  it('does not ask for permission until a button is pressed', () => {
    const { geolocation } = installGeolocation();
    render(<UseGeolocationDemo />);
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.getByText('idle')).toBeInTheDocument();
  });

  it('shows rounded coordinates after a successful request', async () => {
    const user = userEvent.setup();
    const { calls } = installGeolocation();
    render(<UseGeolocationDemo />);
    await user.click(screen.getByRole('button', { name: 'Get my location' }));
    expect(screen.getByText('loading')).toBeInTheDocument();
    act(() => calls[0]?.success(position));
    expect(screen.getByText('52.374')).toBeInTheDocument();
    expect(screen.getByText('±35 m')).toBeInTheDocument();
  });

  it('explains a denied permission', async () => {
    const user = userEvent.setup();
    const { calls } = installGeolocation();
    render(<UseGeolocationDemo />);
    await user.click(screen.getByRole('button', { name: 'Get my location' }));
    act(() => calls[0]?.failure({ code: 1, message: 'User denied' } as GeolocationPositionError));
    expect(screen.getByText('Error: permission-denied')).toBeInTheDocument();
    expect(screen.getByText(/Location access is blocked/)).toBeInTheDocument();
  });

  it('starts and stops watching', async () => {
    const user = userEvent.setup();
    const { geolocation } = installGeolocation();
    geolocation.watchPosition.mockReturnValue(7);
    render(<UseGeolocationDemo />);
    await user.click(screen.getByRole('button', { name: 'Watch position' }));
    expect(screen.getByRole('button', { name: 'Stop watching' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Stop watching' }));
    expect(geolocation.clearWatch).toHaveBeenCalledWith(7);
  });

  it('disables the buttons when unsupported', () => {
    render(<UseGeolocationDemo />);
    expect(screen.getByRole('button', { name: 'Get my location' })).toBeDisabled();
    expect(
      screen.getByText('The Geolocation API is not available in this browser.'),
    ).toBeInTheDocument();
  });
});
