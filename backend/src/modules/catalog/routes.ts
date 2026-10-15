import { Router } from 'express';
import multer from 'multer';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new Error('Only JPEG, PNG, and WebP images are allowed'));
      return;
    }
    callback(null, true);
  },
});
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== 'text/csv' && !file.originalname.toLowerCase().endsWith('.csv')) {
      callback(new Error('Only CSV files are allowed'));
      return;
    }
    callback(null, true);
  },
});
const admin = [authenticate, authorize(Role.SUPER_ADMIN, Role.MANAGER)];

router.get('/categories', asyncHandler(controller.categories));
router.post('/categories', ...admin, asyncHandler(controller.createCategory));
router.patch('/categories/:id', ...admin, asyncHandler(controller.updateCategory));
router.delete('/categories/:id', ...admin, asyncHandler(controller.deleteCategory));

router.get('/brands', asyncHandler(controller.brands));
router.post('/brands', ...admin, asyncHandler(controller.createBrand));
router.patch('/brands/:id', ...admin, asyncHandler(controller.updateBrand));
router.delete('/brands/:id', ...admin, asyncHandler(controller.deleteBrand));

router.get('/products', ...admin, asyncHandler(controller.adminProducts));
router.post('/products', ...admin, asyncHandler(controller.createProduct));
router.patch('/products/:id', ...admin, asyncHandler(controller.updateProduct));
router.delete('/products/:id', ...admin, asyncHandler(controller.deleteProduct));
router.post('/products/:productId/variants', ...admin, asyncHandler(controller.createVariant));
router.patch('/variants/:id', ...admin, asyncHandler(controller.updateVariant));
router.delete('/variants/:id', ...admin, asyncHandler(controller.deleteVariant));
router.post('/products/:productId/images', ...admin, upload.single('image'), asyncHandler(controller.uploadImage));
router.delete('/images/:id', ...admin, asyncHandler(controller.deleteImage));
router.post('/products/import', ...admin, csvUpload.single('file'), asyncHandler(controller.importCsv));

router.get('/public/products', asyncHandler(controller.publicProducts));
router.get('/public/products/:slug', asyncHandler(controller.publicProduct));

export default router;
