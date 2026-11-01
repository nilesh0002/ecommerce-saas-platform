import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';
import { getPublicProduct, listBrands, listCategories } from './service';

test('listCategories filters by isActive: true by default and allows includeInactive', async () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const origFindMany = prisma.category.findMany;
  let capturedWhere: any = null;

  try {
    (prisma.category as any).findMany = async (args: any) => {
      capturedWhere = args?.where;
      return [];
    };

    // Default: public active-only
    await listCategories();
    assert.deepEqual(capturedWhere, { isActive: true });

    // Explicit false: active-only
    await listCategories(false);
    assert.deepEqual(capturedWhere, { isActive: true });

    // Admin view: include inactive
    await listCategories(true);
    assert.equal(capturedWhere, undefined);
  } finally {
    prisma.category.findMany = origFindMany;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
});

test('listBrands filters by isActive: true by default and allows includeInactive', async () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const origFindMany = prisma.brand.findMany;
  let capturedWhere: any = null;

  try {
    (prisma.brand as any).findMany = async (args: any) => {
      capturedWhere = args?.where;
      return [];
    };

    // Default: public active-only
    await listBrands();
    assert.deepEqual(capturedWhere, { isActive: true });

    // Explicit false: active-only
    await listBrands(false);
    assert.deepEqual(capturedWhere, { isActive: true });

    // Admin view: include inactive
    await listBrands(true);
    assert.equal(capturedWhere, undefined);
  } finally {
    prisma.brand.findMany = origFindMany;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
});

test('getPublicProduct enforces active category and brand in query', async () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const origFindFirst = prisma.product.findFirst;
  let capturedWhere: any = null;

  try {
    (prisma.product as any).findFirst = async (args: any) => {
      capturedWhere = args?.where;
      return null;
    };

    await assert.rejects(
      async () => {
        await getPublicProduct('test-product');
      },
      (err: any) => {
        assert(err instanceof AppError);
        assert.equal(err.statusCode, 404);
        assert.equal(err.code, 'PRODUCT_NOT_FOUND');
        return true;
      },
    );

    assert.equal(capturedWhere.slug, 'test-product');
    assert.equal(capturedWhere.isActive, true);
    assert.deepEqual(capturedWhere.category, { isActive: true });
    assert.deepEqual(capturedWhere.OR, [{ brandId: null }, { brand: { isActive: true } }]);
  } finally {
    prisma.product.findFirst = origFindFirst;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
});
