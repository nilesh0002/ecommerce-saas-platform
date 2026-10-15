import bcrypt from 'bcrypt';
import { PrismaClient, Role, CouponType } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash,
      firstName: 'Store',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
      emailVerified: true,
      cart: { create: {} },
      wishlist: { create: {} },
    },
  });
  const category = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: { name: 'Electronics', slug: 'electronics' },
  });
  const brand = await prisma.brand.upsert({
    where: { slug: 'acme' },
    update: {},
    create: { name: 'Acme', slug: 'acme' },
  });
  const product = await prisma.product.upsert({
    where: { slug: 'acme-wireless-headphones' },
    update: {},
    create: {
      name: 'Acme Wireless Headphones',
      slug: 'acme-wireless-headphones',
      description: 'Comfortable wireless headphones for everyday listening.',
      categoryId: category.id,
      brandId: brand.id,
      isFeatured: true,
      variants: {
        create: {
          name: 'Default',
          sku: 'ACME-HEADPHONES-DEFAULT',
          pricePaise: 499900,
          inventory: { create: { quantity: 25, lowStockAt: 5 } },
        },
      },
    },
  });
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      type: CouponType.PERCENTAGE,
      value: 10,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 86400000),
    },
  });
  console.info(`Seeded admin ${admin.email} and product ${product.slug}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
