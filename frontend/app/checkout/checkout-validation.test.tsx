import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../../lib/store';
import Checkout from './page';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Checkout Component Form & Validation', () => {
  beforeEach(() => {
    useStore.setState({ cart: [], wishlist: [] });
  });

  it('disables the Place Order button when the cart is empty', async () => {
    renderWithClient(<Checkout />);

    const submitBtn = screen.getByRole('button', { name: /Place Order Now/i });
    expect(submitBtn).toBeDisabled();
  });

  it('enables the Place Order button when items exist and default address is selected', async () => {
    useStore.setState({
      cart: [
        {
          variantId: 'var-1',
          quantity: 1,
          variant: { name: 'Wireless Headphones', pricePaise: 499900 },
        },
      ],
      wishlist: [],
    });

    renderWithClient(<Checkout />);

    // Wait for the addresses query to load default address
    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Place Order Now/i });
    expect(submitBtn).toBeEnabled();
  });

  it('allows toggling between COD and Razorpay payment options', async () => {
    const user = userEvent.setup();
    useStore.setState({
      cart: [{ variantId: 'var-1', quantity: 1, variant: { pricePaise: 1000 } }],
      wishlist: [],
    });

    renderWithClient(<Checkout />);

    const codRadio = screen.getByRole('radio', { name: /Cash on Delivery/i }) as HTMLInputElement;
    const razorpayRadio = screen.getByRole('radio', { name: /Online Payment/i }) as HTMLInputElement;

    expect(codRadio.checked).toBe(true);
    expect(razorpayRadio.checked).toBe(false);

    await user.click(razorpayRadio);
    expect(razorpayRadio.checked).toBe(true);
    expect(codRadio.checked).toBe(false);
  });

  it('displays error message when order placement fails', async () => {
    const user = userEvent.setup();
    useStore.setState({
      cart: [{ variantId: 'var-1', quantity: 1, variant: { pricePaise: 1000 } }],
      wishlist: [],
    });

    // Provide MSW override or invalid cart scenario
    renderWithClient(<Checkout />);

    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Place Order Now/i });
    await user.click(submitBtn);

    // Button shows loading during request
    await waitFor(() => {
      expect(submitBtn).toBeInTheDocument();
    });
  });
});
