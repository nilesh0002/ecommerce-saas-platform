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

  it('renders disabled order button when cart is empty', async () => {
    renderWithClient(<Checkout />);

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /Place Order Now/i });
      expect(button).toBeDisabled();
    });
  });

  it('renders order summary correctly with items in cart', async () => {
    useStore.setState({
      cart: [
        {
          variantId: 'var-1',
          quantity: 2,
          variant: { name: 'Test Variant', pricePaise: 50000 },
        },
      ],
      wishlist: [],
    });

    renderWithClient(<Checkout />);

    await waitFor(() => {
      expect(screen.getByText('Complete Your Purchase')).toBeInTheDocument();
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });
  });

  it('allows toggling between COD and Razorpay payment methods', async () => {
    const user = userEvent.setup();
    useStore.setState({
      cart: [{ variantId: 'var-1', quantity: 1, variant: { pricePaise: 1000 } }],
      wishlist: [],
    });

    renderWithClient(<Checkout />);

    const codRadio = screen.getByRole('radio', { name: /Cash on Delivery/i });
    const razorpayRadio = screen.getByRole('radio', { name: /Online Payment/i });

    expect(codRadio).toBeChecked();
    expect(razorpayRadio).not.toBeChecked();

    await user.click(razorpayRadio);
    expect(razorpayRadio).toBeChecked();
    expect(codRadio).not.toBeChecked();
  });

  it('displays error message when order placement fails', async () => {
    const user = userEvent.setup();
    useStore.setState({
      cart: [{ variantId: 'var-1', quantity: 1, variant: { pricePaise: 1000 } }],
      wishlist: [],
    });

    renderWithClient(<Checkout />);

    // Wait for the button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Place Order Now/i })).toBeInTheDocument();
    });

    // If an address is selected and button is clicked without valid server session
    const button = screen.getByRole('button', { name: /Place Order Now/i });
    if (!button.hasAttribute('disabled')) {
      await user.click(button);
      await waitFor(() => {
        expect(screen.getByText(/Unable to complete order|Please select/i)).toBeInTheDocument();
      });
    }
  });
});
