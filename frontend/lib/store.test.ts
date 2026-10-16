import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './store';

describe('useStore Zustand cart & wishlist store', () => {
  beforeEach(() => {
    useStore.setState({ cart: [], wishlist: [] });
  });

  it('initializes with an empty cart and empty wishlist', () => {
    const { cart, wishlist } = useStore.getState();
    expect(cart).toEqual([]);
    expect(wishlist).toEqual([]);
  });

  it('adds an item to cart and aggregates quantity when added again', async () => {
    const item1 = {
      variantId: 'var-1',
      quantity: 1,
      variant: { name: 'Black Headphones', pricePaise: 499900 },
    };

    await useStore.getState().add(item1);
    expect(useStore.getState().cart).toHaveLength(1);
    expect(useStore.getState().cart[0]).toEqual({
      variantId: 'var-1',
      quantity: 1,
      variant: { name: 'Black Headphones', pricePaise: 499900 },
    });

    // Add another unit of the same variant
    await useStore.getState().add({ variantId: 'var-1', quantity: 2 });
    expect(useStore.getState().cart).toHaveLength(1);
    expect(useStore.getState().cart[0].quantity).toBe(3);
  });

  it('adds distinct items as separate cart entries', async () => {
    await useStore.getState().add({ variantId: 'var-1', quantity: 1 });
    await useStore.getState().add({ variantId: 'var-2', quantity: 2 });

    const cart = useStore.getState().cart;
    expect(cart).toHaveLength(2);
    expect(cart.find((i) => i.variantId === 'var-1')?.quantity).toBe(1);
    expect(cart.find((i) => i.variantId === 'var-2')?.quantity).toBe(2);
  });

  it('removes an item by variantId', async () => {
    await useStore.getState().add({ variantId: 'var-1', quantity: 1 });
    await useStore.getState().add({ variantId: 'var-2', quantity: 1 });

    await useStore.getState().remove('var-1');
    const cart = useStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0].variantId).toBe('var-2');
  });

  it('overwrites the cart via setCart', () => {
    useStore.getState().setCart([
      { variantId: 'var-seeded-1', quantity: 5 },
      { variantId: 'var-seeded-2', quantity: 2 },
    ]);

    expect(useStore.getState().cart).toHaveLength(2);
    expect(useStore.getState().cart[0].variantId).toBe('var-seeded-1');
  });

  it('toggles wishlist items on and off', () => {
    useStore.getState().toggleWish('var-100');
    expect(useStore.getState().wishlist).toContain('var-100');

    // Toggle off
    useStore.getState().toggleWish('var-100');
    expect(useStore.getState().wishlist).not.toContain('var-100');
  });
});
