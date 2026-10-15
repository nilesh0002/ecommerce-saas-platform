const express = require('express');
const { Pool } = require('pg');
const { extractMerchant } = require('../middleware/tenant');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get products for store (with filters)
router.get('/products', extractMerchant, async (req, res) => {
  try {
    const { category, minPrice, maxPrice, brand, sort = 'name', page = 1, limit = 20 } = req.query;
    
    let query = `
      SELECT p.*, AVG(r.rating) as avg_rating, COUNT(r.id) as review_count
      FROM products p 
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE p.is_active = true AND p.merchant_id = $1
    `;
    let params = [req.merchantId];
    let paramCount = 1;
    
    if (category) {
      query += ` AND p.category = $${++paramCount}`;
      params.push(category);
    }
    
    if (minPrice) {
      query += ` AND p.price >= $${++paramCount}`;
      params.push(minPrice);
    }
    
    if (maxPrice) {
      query += ` AND p.price <= $${++paramCount}`;
      params.push(maxPrice);
    }
    
    if (brand) {
      query += ` AND p.brand ILIKE $${++paramCount}`;
      params.push(`%${brand}%`);
    }
    
    query += ` GROUP BY p.id`;
    
    // Sorting
    const sortOptions = {
      'name': 'p.name ASC',
      'price_low': 'p.price ASC',
      'price_high': 'p.price DESC',
      'rating': 'avg_rating DESC NULLS LAST',
      'newest': 'p.created_at DESC'
    };
    
    query += ` ORDER BY ${sortOptions[sort] || sortOptions.name}`;
    
    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product with specs and reviews
router.get('/products/:id', extractMerchant, async (req, res) => {
  try {
    // Get product
    const productResult = await pool.query(`
      SELECT p.*, AVG(r.rating) as avg_rating, COUNT(r.id) as review_count
      FROM products p 
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE p.id = $1 AND p.merchant_id = $2 AND p.is_active = true
      GROUP BY p.id
    `, [req.params.id, req.merchantId]);
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const product = productResult.rows[0];
    
    // Get specifications
    const specsResult = await pool.query(
      'SELECT spec_name, spec_value FROM product_specs WHERE product_id = $1',
      [req.params.id]
    );
    
    // Get reviews
    const reviewsResult = await pool.query(`
      SELECT r.*, u.first_name, u.last_name 
      FROM reviews r 
      JOIN users u ON r.user_id = u.id 
      WHERE r.product_id = $1 
      ORDER BY r.created_at DESC 
      LIMIT 10
    `, [req.params.id]);
    
    product.specifications = specsResult.rows;
    product.reviews = reviewsResult.rows;
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get categories
router.get('/categories', extractMerchant, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories WHERE merchant_id = $1 AND is_active = true ORDER BY name',
      [req.merchantId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get featured products
router.get('/featured', extractMerchant, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, AVG(r.rating) as avg_rating 
      FROM products p 
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE p.merchant_id = $1 AND p.is_active = true 
      GROUP BY p.id
      ORDER BY avg_rating DESC NULLS LAST, p.created_at DESC 
      LIMIT 8
    `, [req.merchantId]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;