import { Prisma, Product } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';
import { deleteImage, uploadImage } from '../../config/cloudinary';
import { parse } from 'csv-parse/sync';
type UploadedFile = { buffer: Buffer };

type ProductInput = {
  name: string;
  slug: string;
  description?: string | null;
  categoryId: string;
  brandId?: string | null;
  isActive?: boolean;
  isFeatured?: boolean;
};
type CategoryInput = { name: string; slug: string; imageUrl?: string | null; isActive?: boolean };
type BrandInput = { name: string; slug: string; logoUrl?: string | null; isActive?: boolean };

type VariantInput = {
  name: string;
  sku: string;
  pricePaise: number;
  compareAtPaise?: number | null;
  attributes?: Record<string, unknown> | null;
  isActive?: boolean;
  quantity?: number;
  lowStockAt?: number;
};

const productInclude = {
  category: true,
  brand: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: { include: { inventory: true }, orderBy: { createdAt: 'asc' as const } },
};

async function assertReferences(categoryId: string, brandId?: string | null): Promise<void> {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new AppError(400, 'Category not found', 'CATEGORY_NOT_FOUND');
  if (brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) throw new AppError(400, 'Brand not found', 'BRAND_NOT_FOUND');
  }
}

export async function listCategories(includeInactive = true) {
  return prisma.category.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
}

export async function createCategory(input: CategoryInput) {
  return prisma.category.create({ data: input });
}

export async function updateCategory(id: string, input: Partial<CategoryInput>) {
  await requireCategory(id);
  return prisma.category.update({ where: { id }, data: input });
}

export async function deleteCategory(id: string) {
  await requireCategory(id);
  const products = await prisma.product.count({ where: { categoryId: id, isActive: true } });
  if (products > 0) throw new AppError(409, 'Cannot delete a category with active products', 'CATEGORY_IN_USE');
  return prisma.category.update({ where: { id }, data: { isActive: false } });
}

export async function listBrands(includeInactive = true) {
  return prisma.brand.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
}

export async function createBrand(input: BrandInput) {
  return prisma.brand.create({ data: input });
}

export async function updateBrand(id: string, input: Partial<BrandInput>) {
  await requireBrand(id);
  return prisma.brand.update({ where: { id }, data: input });
}

export async function deleteBrand(id: string) {
  await requireBrand(id);
  return prisma.brand.update({ where: { id }, data: { isActive: false } });
}

export async function listAdminProducts(page: number, limit: number) {
  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: productInclude,
    }),
    prisma.product.count(),
  ]);
  return { products, pagination: pagination(page, limit, total) };
}

export async function createProduct(input: ProductInput) {
  await assertReferences(input.categoryId, input.brandId);
  return prisma.product.create({ data: input, include: productInclude });
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  await requireProduct(id);
  if (input.categoryId) await assertReferences(input.categoryId, input.brandId);
  return prisma.product.update({ where: { id }, data: input, include: productInclude });
}

export async function deleteProduct(id: string) {
  await requireProduct(id);
  return prisma.product.update({ where: { id }, data: { isActive: false }, include: productInclude });
}

export async function createVariant(productId: string, input: VariantInput) {
  await requireProduct(productId);
  return prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.create({
      data: {
        productId,
        name: input.name,
        sku: input.sku,
        pricePaise: input.pricePaise,
        compareAtPaise: input.compareAtPaise,
        attributes: input.attributes as Prisma.InputJsonValue | undefined,
        isActive: input.isActive,
        inventory: { create: { quantity: input.quantity ?? 0, lowStockAt: input.lowStockAt ?? 5 } },
      },
      include: { inventory: true },
    });
    return variant;
  });
}

export async function updateVariant(id: string, input: VariantInput) {
  const current = await prisma.productVariant.findUnique({ where: { id } });
  if (!current) throw new AppError(404, 'Variant not found', 'VARIANT_NOT_FOUND');
  return prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.update({
      where: { id },
      data: {
        name: input.name,
        sku: input.sku,
        pricePaise: input.pricePaise,
        compareAtPaise: input.compareAtPaise,
        attributes: input.attributes as Prisma.InputJsonValue | undefined,
        isActive: input.isActive,
      },
      include: { inventory: true },
    });
    await tx.inventory.upsert({
      where: { variantId: id },
      update: {
        quantity: input.quantity,
        lowStockAt: input.lowStockAt,
      },
      create: { variantId: id, quantity: input.quantity ?? 0, lowStockAt: input.lowStockAt ?? 5 },
    });
    return variant;
  });
}

export async function deleteVariant(id: string) {
  const variant = await prisma.productVariant.findUnique({ where: { id } });
  if (!variant) throw new AppError(404, 'Variant not found', 'VARIANT_NOT_FOUND');
  return prisma.productVariant.update({ where: { id }, data: { isActive: false } });
}

export async function addImage(productId: string, file: UploadedFile, input: { variantId?: string | null; altText?: string | null; sortOrder?: number }) {
  await requireProduct(productId);
  if (input.variantId) {
    const variant = await prisma.productVariant.findFirst({ where: { id: input.variantId, productId } });
    if (!variant) throw new AppError(400, 'Variant does not belong to product', 'INVALID_VARIANT');
  }
  const uploaded = await uploadImage(file.buffer);
  try {
    return await prisma.productImage.create({
      data: { productId, variantId: input.variantId, altText: input.altText, sortOrder: input.sortOrder ?? 0, url: uploaded.url, publicId: uploaded.publicId },
    });
  } catch (error) {
    await deleteImage(uploaded.publicId).catch(() => undefined);
    throw error;
  }
}

export async function removeImage(id: string) {
  const image = await prisma.productImage.findUnique({ where: { id } });
  if (!image) throw new AppError(404, 'Image not found', 'IMAGE_NOT_FOUND');
  await prisma.productImage.delete({ where: { id } });
  if (image.publicId) await deleteImage(image.publicId);
}

export async function importProducts(file: UploadedFile) {
  const records = parse(file.buffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  if (records.length === 0) throw new AppError(400, 'CSV file is empty', 'CSV_EMPTY');
  const required = ['name', 'slug', 'categoryId', 'variantName', 'sku', 'pricePaise', 'quantity'];
  const header = records[0];
  if (!header) throw new AppError(400, 'CSV file is empty', 'CSV_EMPTY');
  const missing = required.filter((key) => !(key in header));
  if (missing.length) throw new AppError(400, `CSV is missing columns: ${missing.join(', ')}`, 'CSV_COLUMNS_INVALID');
  let imported = 0;
  await prisma.$transaction(async (tx) => {
    for (const row of records) {
      const pricePaise = Number(row.pricePaise);
      const quantity = Number(row.quantity);
      if (!row.name || !row.slug || !row.categoryId || !row.variantName || !row.sku || !Number.isInteger(pricePaise) || pricePaise < 0 || !Number.isInteger(quantity) || quantity < 0) {
        throw new AppError(400, `Invalid CSV row for SKU ${row.sku || 'unknown'}`, 'CSV_ROW_INVALID');
      }
      const category = await tx.category.findUnique({ where: { id: row.categoryId } });
      if (!category) throw new AppError(400, `Category not found for SKU ${row.sku}`, 'CATEGORY_NOT_FOUND');
      const product = await tx.product.upsert({
        where: { slug: row.slug },
        update: { name: row.name, description: row.description || null, categoryId: row.categoryId },
        create: { name: row.name, slug: row.slug, description: row.description || null, categoryId: row.categoryId },
      });
      await tx.productVariant.upsert({
        where: { sku: row.sku },
        update: { productId: product.id, name: row.variantName, pricePaise },
        create: { productId: product.id, name: row.variantName, sku: row.sku, pricePaise, inventory: { create: { quantity } } },
      });
      imported += 1;
    }
  });
  return { imported };
}

type ListParams = {
  q?: string; category?: string; brand?: string; minPrice?: number; maxPrice?: number; minRating?: number;
  availability: 'in_stock' | 'out_of_stock' | 'all'; sort: string; page: number; limit: number;
};

export async function listPublicProducts(params: ListParams) {
  const conditions: Prisma.Sql[] = [Prisma.sql`p."isActive" = true`];
  if (params.q) conditions.push(Prisma.sql`(p.name ILIKE ${`%${params.q}%`} OR p.description ILIKE ${`%${params.q}%`})`);
  if (params.category) conditions.push(Prisma.sql`c.slug = ${params.category}`);
  if (params.brand) conditions.push(Prisma.sql`b.slug = ${params.brand}`);
  if (params.minPrice !== undefined) conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM "ProductVariant" pv2 WHERE pv2."productId" = p.id AND pv2."pricePaise" >= ${params.minPrice})`);
  if (params.maxPrice !== undefined) conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM "ProductVariant" pv2 WHERE pv2."productId" = p.id AND pv2."pricePaise" <= ${params.maxPrice})`);
  if (params.availability === 'in_stock') conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM "ProductVariant" pv3 JOIN "Inventory" i3 ON i3."variantId" = pv3.id WHERE pv3."productId" = p.id AND i3.quantity - i3.reserved > 0)`);
  if (params.availability === 'out_of_stock') conditions.push(Prisma.sql`NOT EXISTS (SELECT 1 FROM "ProductVariant" pv3 JOIN "Inventory" i3 ON i3."variantId" = pv3.id WHERE pv3."productId" = p.id AND i3.quantity - i3.reserved > 0)`);
  const where = Prisma.join(conditions, ' AND ');
  const having = params.minRating !== undefined ? Prisma.sql`HAVING COALESCE(AVG(r.rating), 0) >= ${params.minRating}` : Prisma.empty;
  const order = {
    newest: Prisma.sql`p."createdAt" DESC`,
    price_asc: Prisma.sql`MIN(pv."pricePaise") ASC`,
    price_desc: Prisma.sql`MAX(pv."pricePaise") DESC`,
    name_asc: Prisma.sql`p.name ASC`,
    rating: Prisma.sql`COALESCE(AVG(r.rating), 0) DESC`,
  }[params.sort] ?? Prisma.sql`p."createdAt" DESC`;
  const offset = (params.page - 1) * params.limit;
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT p.id, p.name, p.slug, p.description, p."isFeatured", p."createdAt",
      c.name AS "categoryName", c.slug AS "categorySlug", b.name AS "brandName", b.slug AS "brandSlug",
      COALESCE(AVG(r.rating), 0)::float AS rating, COUNT(DISTINCT r.id)::int AS "reviewCount",
      MIN(pv."pricePaise")::int AS "minPricePaise", MAX(pv."pricePaise")::int AS "maxPricePaise",
      BOOL_OR(i.quantity - i.reserved > 0) AS "inStock"
    FROM "Product" p
    JOIN "Category" c ON c.id = p."categoryId"
    LEFT JOIN "Brand" b ON b.id = p."brandId"
    LEFT JOIN "ProductVariant" pv ON pv."productId" = p.id AND pv."isActive" = true
    LEFT JOIN "Inventory" i ON i."variantId" = pv.id
    LEFT JOIN "Review" r ON r."productId" = p.id AND r."isApproved" = true
    WHERE ${where}
    GROUP BY p.id, c.id, b.id
    ${having}
    ORDER BY ${order}
    LIMIT ${params.limit} OFFSET ${offset}
  `);
  const countRows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT p.id
      FROM "Product" p
      JOIN "Category" c ON c.id = p."categoryId"
      LEFT JOIN "Brand" b ON b.id = p."brandId"
      LEFT JOIN "ProductVariant" pv ON pv."productId" = p.id AND pv."isActive" = true
      LEFT JOIN "Inventory" i ON i."variantId" = pv.id
      LEFT JOIN "Review" r ON r."productId" = p.id AND r."isApproved" = true
      WHERE ${where}
      GROUP BY p.id
      ${having}
    ) filtered
  `);
  const total = Number(countRows[0]?.count ?? 0);
  return { products: rows, pagination: pagination(params.page, params.limit, total) };
}

export async function getPublicProduct(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: true,
      brand: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { where: { isActive: true }, include: { inventory: true }, orderBy: { pricePaise: 'asc' } },
      reviews: { where: { isApproved: true }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, rating: true, title: true, body: true, createdAt: true, user: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!product) throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  const rating = product.reviews.length ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length : 0;
  return { ...product, rating, reviewCount: product.reviews.length };
}

function pagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total };
}
async function requireCategory(id: string) {
  const record = await prisma.category.findUnique({ where: { id } });
  if (!record) throw new AppError(404, 'Category not found', 'CATEGORY_NOT_FOUND');
  return record;
}
async function requireBrand(id: string) {
  const record = await prisma.brand.findUnique({ where: { id } });
  if (!record) throw new AppError(404, 'Brand not found', 'BRAND_NOT_FOUND');
  return record;
}
async function requireProduct(id: string): Promise<Product> {
  const record = await prisma.product.findUnique({ where: { id } });
  if (!record) throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  return record;
}
