import { z } from 'zod';

const slug = z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const optionalId = z.string().cuid().nullable().optional();

export const idParamSchema = z.object({ id: z.string().cuid() });
export const productParamSchema = z.object({ productId: z.string().cuid() });
export const slugParamSchema = z.object({ slug });

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug,
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const brandSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug,
  logoUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const productSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug,
  description: z.string().max(10000).optional().nullable(),
  categoryId: z.string().cuid(),
  brandId: optionalId,
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export const variantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(80),
  pricePaise: z.number().int().nonnegative(),
  compareAtPaise: z.number().int().nonnegative().optional().nullable(),
  attributes: z.record(z.unknown()).optional().nullable(),
  isActive: z.boolean().optional(),
  quantity: z.number().int().nonnegative().optional(),
  lowStockAt: z.number().int().nonnegative().optional(),
});

export const imageSchema = z.object({
  variantId: z.string().cuid().optional().nullable(),
  altText: z.string().max(200).optional().nullable(),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});

export const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  category: z.string().trim().max(180).optional(),
  brand: z.string().trim().max(180).optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  availability: z.enum(['in_stock', 'out_of_stock', 'all']).default('all'),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name_asc', 'rating']).default('newest'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
