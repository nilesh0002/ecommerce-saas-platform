import { Request, Response } from 'express';
import * as service from './service';
import {
  brandSchema, categorySchema, idParamSchema, imageSchema, listQuerySchema,
  productParamSchema, productSchema, slugParamSchema, variantSchema,
} from './validation';

export async function categories(_req: Request, res: Response) {
  res.json({ success: true, data: await service.listCategories() });
}
export async function createCategory(req: Request, res: Response) {
  res.status(201).json({ success: true, data: await service.createCategory(categorySchema.parse(req.body)) });
}
export async function updateCategory(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ success: true, data: await service.updateCategory(id, categorySchema.partial().parse(req.body)) });
}
export async function deleteCategory(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ success: true, data: await service.deleteCategory(id) });
}
export async function brands(_req: Request, res: Response) {
  res.json({ success: true, data: await service.listBrands() });
}
export async function createBrand(req: Request, res: Response) {
  res.status(201).json({ success: true, data: await service.createBrand(brandSchema.parse(req.body)) });
}
export async function updateBrand(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ success: true, data: await service.updateBrand(id, brandSchema.partial().parse(req.body)) });
}
export async function deleteBrand(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ success: true, data: await service.deleteBrand(id) });
}
export async function adminProducts(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  res.json({ success: true, data: await service.listAdminProducts(page, limit) });
}
export async function createProduct(req: Request, res: Response) {
  res.status(201).json({ success: true, data: await service.createProduct(productSchema.parse(req.body)) });
}
export async function updateProduct(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ success: true, data: await service.updateProduct(id, productSchema.partial().parse(req.body)) });
}
export async function deleteProduct(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ success: true, data: await service.deleteProduct(id) });
}
export async function createVariant(req: Request, res: Response) {
  const { productId } = productParamSchema.parse(req.params);
  res.status(201).json({ success: true, data: await service.createVariant(productId, variantSchema.parse(req.body)) });
}
export async function updateVariant(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ success: true, data: await service.updateVariant(id, variantSchema.parse(req.body)) });
}
export async function deleteVariant(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ success: true, data: await service.deleteVariant(id) });
}
export async function uploadImage(req: Request, res: Response) {
  const { productId } = productParamSchema.parse(req.params);
  if (!req.file) {
    res.status(400).json({ success: false, error: { code: 'IMAGE_REQUIRED', message: 'An image file is required' } });
    return;
  }
  res.status(201).json({
    success: true,
    data: await service.addImage(productId, req.file, imageSchema.parse(req.body)),
  });
}
export async function deleteImage(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  await service.removeImage(id);
  res.json({ success: true, data: { message: 'Image deleted' } });
}
export async function importCsv(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json({ success: false, error: { code: 'CSV_REQUIRED', message: 'A CSV file is required' } });
    return;
  }
  res.status(201).json({ success: true, data: await service.importProducts(req.file) });
}
export async function publicProducts(req: Request, res: Response) {
  res.json({ success: true, data: await service.listPublicProducts(listQuerySchema.parse(req.query)) });
}
export async function publicProduct(req: Request, res: Response) {
  const { slug } = slugParamSchema.parse(req.params);
  res.json({ success: true, data: await service.getPublicProduct(slug) });
}
