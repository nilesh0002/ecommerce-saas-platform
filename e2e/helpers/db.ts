import { PrismaClient, Role, PaymentMethod, OrderStatus, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

export const prisma = new PrismaClient();

export async function createTestUser(email: string, role: Role = Role.CUSTOMER) {
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { role, isActive: true },
    create: {
      email,
      firstName: 'Test',
      lastName: role === Role.CUSTOMER ? 'Customer' : 'Staff',
      passwordHash,
      role,
      isActive: true,
      emailVerified: true,
      cart: { create: {} },
      wishlist: { create: {} },
    },
  });

  const address = await prisma.address.create({
    data: {
      userId: user.id,
      label: 'Home',
      fullName: `${user.firstName} ${user.lastName}`,
      phone: '9876543210',
      line1: '123 Test Street',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'IN',
      isDefault: true,
    },
  });

  return { user, address };
}

export async function createLimitedStockProduct(sku: string, initialQuantity = 1) {
  const slug = `product-${sku.toLowerCase()}`;
  const category = await prisma.category.upsert({
    where: { slug: 'test-category' },
    update: {},
    create: { name: 'Test Category', slug: 'test-category' },
  });

  const product = await prisma.product.upsert({
    where: { slug },
    update: { isActive: true },
    create: {
      name: `Race Product ${sku}`,
      slug,
      description: 'Product for race condition testing',
      categoryId: category.id,
      isActive: true,
      isFeatured: false,
    },
  });

  const variant = await prisma.productVariant.upsert({
    where: { sku },
    update: {
      isActive: true,
      inventory: {
        upsert: {
          update: { quantity: initialQuantity, reserved: 0 },
          create: { quantity: initialQuantity, reserved: 0 },
        },
      },
    },
    create: {
      productId: product.id,
      sku,
      name: 'Standard Edition',
      pricePaise: 150000,
      isActive: true,
      inventory: {
        create: { quantity: initialQuantity, reserved: 0 },
      },
    },
    include: { inventory: true },
  });

  return { product, variant };
}

export async function createPendingRazorpayOrder(userId: string, addressId: string) {
  const suffix = Date.now().toString();
  const category = await prisma.category.upsert({
    where: { slug: 'test-category' },
    update: {},
    create: { name: 'Test Category', slug: 'test-category' },
  });
  const product = await prisma.product.create({
    data: {
      name: `Razorpay Product ${suffix}`,
      slug: `razorpay-prod-${suffix}`,
      categoryId: category.id,
      isActive: true,
    },
  });
  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      sku: `RZP-${suffix}`,
      name: 'Default',
      pricePaise: 499900,
      inventory: { create: { quantity: 10, lowStockAt: 2 } },
    },
  });
  const razorpayOrderId = `order_test_${suffix}`;
  const order = await prisma.order.create({
    data: {
      userId,
      addressId,
      status: OrderStatus.PENDING,
      paymentMethod: PaymentMethod.RAZORPAY,
      paymentStatus: PaymentStatus.PENDING,
      subtotalPaise: 499900,
      totalPaise: 499900,
      razorpayOrderId,
      items: {
        create: {
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          variantName: 'Default',
          sku: variant.sku,
          unitPricePaise: 499900,
          quantity: 1,
          totalPaise: 499900,
        },
      },
      statusHistory: {
        create: {
          to: OrderStatus.PENDING,
          createdBy: userId,
          note: 'Order created',
        },
      },
      payment: {
        create: {
          razorpayOrderId,
          amountPaise: 499900,
          status: PaymentStatus.PENDING,
        },
      },
    },
    include: { items: true, payment: true },
  });

  return { order, product, variant, razorpayOrderId };
}
