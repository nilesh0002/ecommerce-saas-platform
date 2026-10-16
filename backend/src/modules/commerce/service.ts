import { Prisma, Coupon } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import { scheduleAbandonedCartReminder } from '../../jobs/queues';

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      variant: {
        include: {
          product: { select: { id: true, name: true, slug: true, isActive: true } },
          images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
          inventory: true,
        },
      },
    },
  },
};

async function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
    include: cartInclude,
  });
}

async function getActiveVariant(variantId: string) {
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, isActive: true, product: { isActive: true } },
    include: { product: { select: { isActive: true } }, inventory: true },
  });
  if (!variant) throw new AppError(404, 'Product variant not found', 'VARIANT_NOT_FOUND');
  return variant;
}

async function assertQuantityAvailable(variantId: string, quantity: number): Promise<void> {
  const variant = await getActiveVariant(variantId);
  const available = (variant.inventory?.quantity ?? 0) - (variant.inventory?.reserved ?? 0);
  if (quantity > available) {
    throw new AppError(409, `Only ${Math.max(available, 0)} units are available`, 'INSUFFICIENT_STOCK');
  }
}

export async function getCart(userId: string) {
  return getOrCreateCart(userId);
}

export async function addToCart(userId: string, variantId: string, quantity: number) {
  await assertQuantityAvailable(variantId, quantity);
  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find((item) => item.variantId === variantId);
  const nextQuantity = (existing?.quantity ?? 0) + quantity;
  await assertQuantityAvailable(variantId, nextQuantity);
  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    update: { quantity: nextQuantity },
    create: { cartId: cart.id, variantId, quantity },
  });
  await scheduleAbandonedCartReminder({ userId, cartId: cart.id });
  return getCart(userId);
}

export async function updateCartItem(userId: string, variantId: string, quantity: number) {
  const cart = await getOrCreateCart(userId);
  const item = cart.items.find((entry) => entry.variantId === variantId);
  if (!item) throw new AppError(404, 'Cart item not found', 'CART_ITEM_NOT_FOUND');
  await assertQuantityAvailable(variantId, quantity);
  await prisma.cartItem.update({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    data: { quantity },
  });
  await scheduleAbandonedCartReminder({ userId, cartId: cart.id });
  return getCart(userId);
}

export async function removeFromCart(userId: string, variantId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
  return getCart(userId);
}

export async function clearCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return getCart(userId);
}

export async function mergeGuestCart(userId: string, items: Array<{ variantId: string; quantity: number }>) {
  const cart = await getOrCreateCart(userId);
  const merged = new Map(cart.items.map((item) => [item.variantId, item.quantity]));
  for (const item of items) {
    await assertQuantityAvailable(item.variantId, item.quantity);
    merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + item.quantity);
  }
  for (const [variantId, quantity] of merged) {
    await assertQuantityAvailable(variantId, quantity);
  }
  await prisma.$transaction(
    [...merged].map(([variantId, quantity]) =>
      prisma.cartItem.upsert({
        where: { cartId_variantId: { cartId: cart.id, variantId } },
        update: { quantity },
        create: { cartId: cart.id, variantId, quantity },
      }),
    ),
  );
  return getCart(userId);
}

export async function getWishlist(userId: string) {
  const wishlist = await prisma.wishlist.upsert({
    where: { userId },
    update: {},
    create: { userId },
    include: {
      items: {
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, slug: true, isActive: true } },
          variant: { include: { inventory: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } } },
        },
      },
    },
  });
  return wishlist;
}

export async function addToWishlist(userId: string, variantId: string) {
  const variant = await getActiveVariant(variantId);
  const wishlist = await prisma.wishlist.upsert({ where: { userId }, update: {}, create: { userId } });
  await prisma.wishlistItem.upsert({
    where: { wishlistId_variantId: { wishlistId: wishlist.id, variantId } },
    update: {},
    create: { wishlistId: wishlist.id, variantId, productId: variant.productId },
  });
  return getWishlist(userId);
}

export async function removeFromWishlist(userId: string, variantId: string) {
  const wishlist = await prisma.wishlist.upsert({ where: { userId }, update: {}, create: { userId } });
  await prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id, variantId } });
  return getWishlist(userId);
}

export async function listAddresses(userId: string) {
  return prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
}

export async function createAddress(userId: string, input: Omit<Prisma.AddressUncheckedCreateInput, 'userId'>) {
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.create({ data: { ...input, userId } });
  });
}

export async function updateAddress(userId: string, id: string, input: Prisma.AddressUpdateInput) {
  await requireAddress(userId, id);
  return prisma.$transaction(async (tx) => {
    if (input.isDefault === true) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.update({ where: { id }, data: input });
  });
}

export async function deleteAddress(userId: string, id: string) {
  await requireAddress(userId, id);
  await prisma.address.delete({ where: { id } });
}

async function requireAddress(userId: string, id: string) {
  const address = await prisma.address.findFirst({ where: { id, userId } });
  if (!address) throw new AppError(404, 'Address not found', 'ADDRESS_NOT_FOUND');
  return address;
}

export async function calculateCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  if (cart.items.length === 0) throw new AppError(400, 'Cart is empty', 'CART_EMPTY');
  const items = cart.items.map((item) => {
    if (!item.variant.product.isActive || !item.variant.isActive) {
      throw new AppError(409, `${item.variant.product.name} is no longer available`, 'ITEM_UNAVAILABLE');
    }
    const available = (item.variant.inventory?.quantity ?? 0) - (item.variant.inventory?.reserved ?? 0);
    if (item.quantity > available) throw new AppError(409, `Insufficient stock for ${item.variant.product.name}`, 'INSUFFICIENT_STOCK');
    return {
      variantId: item.variantId,
      productId: item.variant.productId,
      name: item.variant.product.name,
      variantName: item.variant.name,
      sku: item.variant.sku,
      quantity: item.quantity,
      unitPricePaise: item.variant.pricePaise,
      totalPaise: item.quantity * item.variant.pricePaise,
    };
  });
  return { items, subtotalPaise: items.reduce((sum, item) => sum + item.totalPaise, 0) };
}

async function validateCoupon(code: string, userId: string, subtotalPaise: number): Promise<{ coupon: Coupon; discountPaise: number }> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  const now = new Date();
  if (!coupon || !coupon.isActive || coupon.startsAt > now || coupon.expiresAt < now) {
    throw new AppError(400, 'Coupon is invalid or expired', 'COUPON_INVALID');
  }
  if (subtotalPaise < coupon.minimumPaise) throw new AppError(400, `Minimum order value is ${coupon.minimumPaise} paise`, 'COUPON_MINIMUM_NOT_MET');
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw new AppError(400, 'Coupon usage limit reached', 'COUPON_LIMIT_REACHED');
  const used = await prisma.couponUsage.findUnique({ where: { couponId_userId: { couponId: coupon.id, userId } } });
  if (used) throw new AppError(400, 'Coupon has already been used', 'COUPON_ALREADY_USED');
  const raw = coupon.type === 'PERCENTAGE' ? Math.floor((subtotalPaise * coupon.value) / 100) : coupon.value;
  return { coupon, discountPaise: Math.min(raw, coupon.maximumDiscountPaise ?? raw, subtotalPaise) };
}

export async function calculateCheckout(userId: string, addressId: string, couponCode?: string | null) {
  const address = await requireAddress(userId, addressId);
  const cart = await calculateCart(userId);
  const discount = couponCode ? await validateCoupon(couponCode, userId, cart.subtotalPaise) : null;
  const discountedSubtotal = cart.subtotalPaise - (discount?.discountPaise ?? 0);
  const shippingPaise = discountedSubtotal >= env.FREE_SHIPPING_THRESHOLD_PAISE ? 0 : env.SHIPPING_FLAT_RATE_PAISE;
  const taxPaise = Math.round(discountedSubtotal * env.TAX_RATE);
  const totalPaise = discountedSubtotal + taxPaise + shippingPaise;
  return {
    address,
    items: cart.items,
    subtotalPaise: cart.subtotalPaise,
    discountPaise: discount?.discountPaise ?? 0,
    taxRate: env.TAX_RATE,
    taxPaise,
    shippingPaise,
    totalPaise,
    coupon: discount ? { code: discount.coupon.code, type: discount.coupon.type, value: discount.coupon.value } : null,
    currency: 'INR',
  };
}

export async function validateCouponForUser(userId: string, code: string) {
  const cart = await calculateCart(userId);
  const result = await validateCoupon(code, userId, cart.subtotalPaise);
  return { code: result.coupon.code, discountPaise: result.discountPaise, subtotalPaise: cart.subtotalPaise };
}
