const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');

// Configure Cloudflare R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload file to Cloudflare R2
 * @param {Object} file - Multer file object
 * @returns {Promise<string>} - Public URL of uploaded file
 */
const uploadToR2 = async (file) => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(file.originalname);
    const filename = `products/${timestamp}-${randomString}${extension}`;

    // Prepare upload parameters
    const uploadParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: 'inline',
      CacheControl: 'public, max-age=31536000', // 1 year cache
    };

    // Upload to R2
    const command = new PutObjectCommand(uploadParams);
    await r2Client.send(command);

    // Return public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${filename}`;
    
    console.log(`File uploaded successfully: ${publicUrl}`);
    return publicUrl;
    
  } catch (error) {
    console.error('R2 upload error:', error);
    throw new Error('Failed to upload file to R2');
  }
};

/**
 * Delete file from Cloudflare R2
 * @param {string} fileUrl - Public URL of file to delete
 * @returns {Promise<void>}
 */
const deleteFromR2 = async (fileUrl) => {
  try {
    if (!fileUrl || !fileUrl.includes(process.env.R2_PUBLIC_URL)) {
      console.log('Invalid file URL for deletion:', fileUrl);
      return;
    }

    // Extract filename from URL
    const filename = fileUrl.replace(`${process.env.R2_PUBLIC_URL}/`, '');

    // Prepare delete parameters
    const deleteParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filename,
    };

    // Delete from R2
    const command = new DeleteObjectCommand(deleteParams);
    await r2Client.send(command);
    
    console.log(`File deleted successfully: ${filename}`);
    
  } catch (error) {
    console.error('R2 delete error:', error);
    throw new Error('Failed to delete file from R2');
  }
};

/**
 * Validate file before upload
 * @param {Object} file - Multer file object
 * @returns {Object} - Validation result
 */
const validateFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 5MB.'
    };
  }

  return { valid: true };
};

module.exports = {
  uploadToR2,
  deleteFromR2,
  validateFile
};