const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const Joi = require('joi');
const { uploadToR2, deleteFromR2 } = require('../utils/r2Upload');
const { authenticateAdmin } = require('../middleware/auth');
const { extractMerchant, addMerchantFilter } = require('../middleware/tenant');
const { sendOutOfStockAlert } = require('../utils/emailService');
const router = express.Router();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Apply tenant middleware to all routes
router.use(extractMerchant);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Validation schemas
const productSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().allow('').max(1000),
  price: Joi.number().positive().required(),
  stock: Joi.number().integer().min(0).required(),
  category: Joi.string().max(100).allow('')
});

/**
 * GET /admin/products/low-stock
 * Get products with low stock (< 5 units)
 */
router.get('/low-stock', authenticateAdmin, async (req, res) => {
  try {
    const { query, params } = addMerchantFilter(
      req, 
      'SELECT * FROM products WHERE stock < 5 ORDER BY stock ASC, name ASC'
    );
    
    const result = await pool.query(query, params);

    res.json({
      products: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({ error: 'Failed to fetch low stock products' });
  }
});

/**
 * GET /admin/products
 * Get all products with pagination and filtering
 */
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const offset = (page - 1) * limit;

    let baseQuery = 'SELECT * FROM products';
    let countQuery = 'SELECT COUNT(*) FROM products';
    let queryParams = [];
    let whereConditions = [];

    // Add search filter
    if (search) {
      whereConditions.push(`(name ILIKE $${queryParams.length + 1} OR description ILIKE $${queryParams.length + 1})`);
      queryParams.push(`%${search}%`);
    }

    // Add category filter
    if (category) {
      whereConditions.push(`category = $${queryParams.length + 1}`);
      queryParams.push(category);
    }

    // Build WHERE clause
    if (whereConditions.length > 0) {
      const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
      baseQuery += whereClause;
      countQuery += whereClause;
    }

    // Add merchant filter
    const { query: finalQuery, params: finalParams } = addMerchantFilter(
      req, 
      baseQuery + ' ORDER BY created_at DESC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2),
      [...queryParams, limit, offset]
    );

    const { query: finalCountQuery, params: countParams } = addMerchantFilter(
      req, 
      countQuery, 
      queryParams
    );

    // Execute queries
    const [productsResult, countResult] = await Promise.all([
      pool.query(finalQuery, finalParams),
      pool.query(finalCountQuery, countParams)
    ]);

    const totalProducts = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalProducts / limit);

    res.json({
      products: productsResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProducts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * POST /admin/products
 * Create new product with optional image upload
 */
router.post('/', authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    // Validate product data
    const { error, value } = productSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, description, price, stock, category } = value;
    let imageUrl = null;

    // Upload image to R2 if provided
    if (req.file) {
      try {
        imageUrl = await uploadToR2(req.file);
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(400).json({ error: 'Failed to upload image' });
      }
    }

    // Determine merchant ID
    const merchantId = req.admin.role === 'super_admin' && req.body.merchant_id 
      ? req.body.merchant_id 
      : req.admin.merchantId || req.merchantId;

    if (!merchantId) {
      return res.status(400).json({ error: 'Merchant ID is required' });
    }

    // Create product
    const result = await pool.query(
      'INSERT INTO products (name, description, price, stock, category, brand, model, warranty_months, image_url, merchant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [name, description, parseFloat(price), parseInt(stock), category, req.body.brand, req.body.model, req.body.warranty_months || 12, imageUrl, merchantId]
    );

    res.status(201).json({
      success: true,
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

/**
 * PUT /admin/products/:id
 * Update existing product
 */
router.put('/:id', authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate product data
    const { error, value } = productSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, description, price, stock, category } = value;

    // Get current product
    const { query: selectQuery, params: selectParams } = addMerchantFilter(
      req, 
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    
    const currentResult = await pool.query(selectQuery, selectParams);
    
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const currentProduct = currentResult.rows[0];
    const oldStock = currentProduct.stock;
    const newStock = parseInt(stock);
    let imageUrl = currentProduct.image_url;

    // Handle image upload
    if (req.file) {
      try {
        // Delete old image if exists
        if (currentProduct.image_url) {
          await deleteFromR2(currentProduct.image_url);
        }
        
        // Upload new image
        imageUrl = await uploadToR2(req.file);
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(400).json({ error: 'Failed to upload image' });
      }
    }

    // Update product
    const { query: updateQuery, params: updateParams } = addMerchantFilter(
      req,
      'UPDATE products SET name = $1, description = $2, price = $3, stock = $4, category = $5, image_url = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
      [name, description, parseFloat(price), newStock, category, imageUrl, id]
    );

    const result = await pool.query(updateQuery, updateParams);

    // Send email alert if stock went from > 0 to 0
    if (oldStock > 0 && newStock === 0) {
      try {
        await sendOutOfStockAlert(result.rows[0]);
      } catch (emailError) {
        console.error('Failed to send out of stock alert:', emailError);
      }
    }

    res.json({
      success: true,
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

/**
 * DELETE /admin/products/:id
 * Delete product and associated image
 */
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get product to delete image
    const { query: selectQuery, params: selectParams } = addMerchantFilter(
      req,
      'SELECT image_url FROM products WHERE id = $1',
      [id]
    );
    
    const result = await pool.query(selectQuery, selectParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = result.rows[0];

    // Delete image from R2 if exists
    if (product.image_url) {
      try {
        await deleteFromR2(product.image_url);
      } catch (deleteError) {
        console.error('Failed to delete image:', deleteError);
      }
    }

    // Delete from database
    const { query: deleteQuery, params: deleteParams } = addMerchantFilter(
      req,
      'DELETE FROM products WHERE id = $1',
      [id]
    );
    
    await pool.query(deleteQuery, deleteParams);

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;