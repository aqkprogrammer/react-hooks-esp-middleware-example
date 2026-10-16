import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import CustomHookStateDemo from './CustomHookStateDemo';

const card = (name: string) => within(screen.getByRole('region', { name }));

describe('CustomHookStateDemo', () => {
  it('gives each component calling the Hook its own state', async () => {
    const user = userEvent.setup();
    render(<CustomHookStateDemo />);
    await user.click(screen.getByRole('button', { name: '+1 for Team A' }));
    await user.click(screen.getByRole('button', { name: '+1 for Team A' }));
    await user.click(screen.getByRole('button', { name: '+3 for Team B' }));
    expect(card('Team A').getByText('Team A: 2')).toBeInTheDocument();
    expect(card('Team B').getByText('Team B: 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset Team A' }));
    expect(card('Team A').getByText('Team A: 0')).toBeInTheDocument();
    expect(card('Team B').getByText('Team B: 3')).toBeInTheDocument();
  });

  it('shares state only when one Hook call is passed to both displays', async () => {
    const user = userEvent.setup();
    render(<CustomHookStateDemo />);
    await user.click(screen.getByRole('button', { name: '+1 from Display 1' }));
    await user.click(screen.getByRole('button', { name: '+1 from Display 2' }));
    expect(card('Display 1').getByText('Display 1: 2')).toBeInTheDocument();
    expect(card('Display 2').getByText('Display 2: 2')).toBeInTheDocument();
  });
});
