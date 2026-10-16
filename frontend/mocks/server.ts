import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth me handler
  http.get('*/auth/me', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 'user-1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CUSTOMER',
        emailVerified: true,
      },
    });
  }),
  // Cart items handler
  http.post('*/commerce/cart/items', async ({ request }) => {
    const body = (await request.json()) as { variantId: string; quantity: number };
    return HttpResponse.json({
      success: true,
      data: {
        id: 'cart-1',
        items: [{ variantId: body.variantId, quantity: body.quantity }],
      },
    });
  }),

  // Delete cart item handler
  http.delete('*/commerce/cart/items/:id', () => {
    return HttpResponse.json({
      success: true,
      data: { id: 'cart-1', items: [] },
    });
  }),

  // Get cart handler
  http.get('*/commerce/cart', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 'cart-1',
        items: [],
      },
    });
  }),

  // Get addresses handler
  http.get('*/commerce/addresses', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'addr-1',
          fullName: 'John Doe',
          phone: '9876543210',
          line1: '123 Baker Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'IN',
          isDefault: true,
        },
      ],
    });
  }),

  // Create order handler
  http.post('*/orders', async ({ request }) => {
    const body = (await request.json()) as { addressId: string; paymentMethod: string };
    if (!body.addressId) {
      return HttpResponse.json(
        { success: false, error: { message: 'Address is required' } },
        { status: 400 },
      );
    }
    return HttpResponse.json({
      success: true,
      data: {
        order: {
          id: 'order-101',
          status: 'CONFIRMED',
          paymentMethod: body.paymentMethod,
          totalPaise: 499900,
        },
      },
    });
  }),
];

export const server = setupServer(...handlers);
