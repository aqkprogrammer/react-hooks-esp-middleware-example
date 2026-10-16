import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CART_STORAGE_KEY } from './cart';
import MiddlewarePipelineDemo from './MiddlewarePipelineDemo';

async function addProduct(user: ReturnType<typeof userEvent.setup>, name: string) {
  const product = screen.getByLabelText('Product');
  await user.clear(product);
  if (name) await user.type(product, name);
  await user.click(screen.getByRole('button', { name: 'Add to cart' }));
}

const cart = () => within(screen.getByRole('list', { name: 'Cart items' }));
const stage = (name: string) =>
  within(screen.getByRole('list', { name: 'Pipeline order' })).getByText(
    new RegExp(`\\d\\. ${name}$`),
  ).parentElement as HTMLElement;

describe('MiddlewarePipelineDemo', () => {
  it('runs a valid action through every middleware to the reducer', async () => {
    const user = userEvent.setup();
    render(<MiddlewarePipelineDemo />);
    await addProduct(user, 'Tea');

    expect(cart().getByText(/Tea × 1/)).toBeInTheDocument();
    expect(screen.getByLabelText('Product')).toHaveValue('');
    const log = within(screen.getByRole('log', { name: 'Logger output' }));
    expect(log.getByText(/ADD_ITEM → state changed/)).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Analytics events' })).getByText(/Product Added/),
    ).toBeInTheDocument();
    expect(within(stage('reducer')).getByText('reduced')).toBeInTheDocument();
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? '[]')).toEqual([
        { id: 'tea', name: 'Tea', price: 4.5, qty: 1 },
      ]),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Saved 1 line(s)');
  });

  it('stops invalid actions at validation and dispatches a failure instead', async () => {
    const user = userEvent.setup();
    render(<MiddlewarePipelineDemo />);
    await addProduct(user, '');

    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(cart().getByText('The cart is empty.')).toBeInTheDocument();
    expect(within(stage('validation')).getByText('stopped here')).toBeInTheDocument();
    expect(within(stage('reducer')).getByText('not reached')).toBeInTheDocument();
    const trace = within(screen.getByRole('list', { name: 'Last dispatch trace' }));
    expect(trace.getByText('↳ VALIDATION_FAILED @ reducer: reduced')).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Analytics events' })).getByText(
        'No events tracked yet.',
      ),
    ).toBeInTheDocument();
  });

  it('lets invalid data through when validation is switched off', async () => {
    const user = userEvent.setup();
    render(<MiddlewarePipelineDemo />);
    await user.click(screen.getByRole('checkbox', { name: 'validation' }));
    await addProduct(user, '');
    expect(cart().getByText(/\(no name\) × 1/)).toBeInTheDocument();
    expect(within(stage('validation')).getByText('skipped (off)')).toBeInTheDocument();
  });

  it('loads products with a thunk, validating each added item', async () => {
    const user = userEvent.setup();
    render(<MiddlewarePipelineDemo />);
    await user.click(screen.getByRole('button', { name: 'Add 2 top-rated products (thunk)' }));
    await waitFor(() => expect(cart().getAllByRole('button', { name: /^Remove/ })).toHaveLength(2));
    const log = within(screen.getByRole('log', { name: 'Logger output' }));
    expect(log.getByText(/SUGGESTIONS_LOADED/)).toBeInTheDocument();
    expect(log.queryByText(/^thunk/)).not.toBeInTheDocument();
  });

  it('reports reducer errors, or lets them escape when error reporting is off', async () => {
    const user = userEvent.setup();
    render(<MiddlewarePipelineDemo />);
    await user.click(screen.getByRole('button', { name: 'Trigger a reducer bug' }));
    expect(
      within(screen.getByRole('list', { name: 'Error reports' })).getByText(
        /cannot handle SIMULATE_REDUCER_BUG \(while handling SIMULATE_REDUCER_BUG\)/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Error shown from state')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'errorReporting' }));
    await user.click(screen.getByRole('button', { name: 'Trigger a reducer bug' }));
    expect(screen.getByText('Uncaught error escaped dispatch')).toBeInTheDocument();
  });

  it('hydrates the cart from storage and removes items', async () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ id: 'jam', name: 'Jam', price: 3, qty: 2 }]),
    );
    const user = userEvent.setup();
    render(<MiddlewarePipelineDemo />);
    expect(screen.getByText('Restored from localStorage')).toBeInTheDocument();
    expect(cart().getByText('$6.00')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Jam' }));
    expect(cart().getByText('The cart is empty.')).toBeInTheDocument();
  });
});
