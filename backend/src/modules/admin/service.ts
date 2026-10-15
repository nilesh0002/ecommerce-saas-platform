import { OrderStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';

const orderInclude = {
  user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
  items: true,
  payment: true,
} satisfies Prisma.OrderInclude;

export async function analytics(from?: Date, to?: Date) {
  const where = { createdAt: { gte: from, lte: to } };
  const [orders, customers, products, revenue, recentOrders, lowStock] = await Promise.all([
    prisma.order.count({ where }),
    prisma.user.count({ where: { role: Role.CUSTOMER, createdAt: { gte: from, lte: to } } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.aggregate({ where: { ...where, paymentStatus: { in: ['PAID', 'PENDING'] } }, _sum: { totalPaise: true } }),
    prisma.order.findMany({ take: 8, orderBy: { createdAt: 'desc' }, include: orderInclude }),
    prisma.inventory.findMany({ where: { quantity: { lte: 5 } }, take: 10, orderBy: { quantity: 'asc' }, include: { variant: { include: { product: true } } } }),
  ]);
  const daily = await prisma.order.groupBy({ by: ['createdAt'], where, _sum: { totalPaise: true }, _count: true });
  return { cards: { orders, customers, products, revenuePaise: revenue._sum.totalPaise || 0 }, daily, recentOrders, lowStock };
}

export async function listCustomers(page = 1, limit = 20, search = '') {
  const where: Prisma.UserWhereInput = { role: Role.CUSTOMER, ...(search ? { OR: [{ email: { contains: search, mode: 'insensitive' } }, { firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }] } : {}) };
  const [customers, total] = await prisma.$transaction([
    prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, select: { id: true, email: true, firstName: true, lastName: true, phone: true, isActive: true, createdAt: true, _count: { select: { orders: true } } } }),
    prisma.user.count({ where }),
  ]);
  return { customers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function listOrders(page = 1, limit = 20, status?: OrderStatus) {
  const where = status ? { status } : undefined;
  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: orderInclude }),
    prisma.order.count({ where }),
  ]);
  return { orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function listCoupons() { return prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }); }
export async function createCoupon(data: Prisma.CouponCreateInput) { return prisma.coupon.create({ data }); }
export async function updateCoupon(id: string, data: Prisma.CouponUpdateInput) { return prisma.coupon.update({ where: { id }, data }); }
export async function deleteCoupon(id: string) { return prisma.coupon.update({ where: { id }, data: { isActive: false } }); }

export async function listBanners() { return prisma.banner.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }); }
export async function createBanner(data: Prisma.BannerCreateInput) { return prisma.banner.create({ data }); }
export async function updateBanner(id: string, data: Prisma.BannerUpdateInput) { return prisma.banner.update({ where: { id }, data }); }
export async function deleteBanner(id: string) { return prisma.banner.update({ where: { id }, data: { isActive: false } }); }

export async function report(type: 'orders' | 'customers' | 'products') {
  if (type === 'customers') {
    const rows = await prisma.user.findMany({ where: { role: Role.CUSTOMER }, select: { id: true, email: true, firstName: true, lastName: true, createdAt: true } });
    return { filename: 'customers.csv', headers: ['id', 'email', 'firstName', 'lastName', 'createdAt'], rows };
  }
  if (type === 'products') {
    const rows = await prisma.product.findMany({ include: { category: true, variants: { include: { inventory: true } } } });
    return { filename: 'products.csv', headers: ['id', 'name', 'category', 'sku', 'pricePaise', 'quantity'], rows: rows.flatMap((p) => p.variants.map((v) => ({ id: p.id, name: p.name, category: p.category.name, sku: v.sku, pricePaise: v.pricePaise, quantity: v.inventory?.quantity ?? 0 }))) };
  }
  const rows = await prisma.order.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } });
  return { filename: 'orders.csv', headers: ['id', 'email', 'status', 'paymentStatus', 'totalPaise', 'createdAt'], rows: rows.map((o) => ({ id: o.id, email: o.user.email, status: o.status, paymentStatus: o.paymentStatus, totalPaise: o.totalPaise, createdAt: o.createdAt })) };
}
