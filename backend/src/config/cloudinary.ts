import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';
import { AppError } from '../utils/errors';

const configured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);

if (configured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export async function uploadImage(buffer: Buffer, folder = 'ecommerce/products') {
  if (!configured) {
    throw new AppError(503, 'Cloudinary is not configured', 'MEDIA_NOT_CONFIGURED');
  }
  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error || !result) {
          reject(new AppError(502, 'Image upload failed', 'MEDIA_UPLOAD_FAILED'));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  if (!configured) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}
