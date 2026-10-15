const express = require('express');
const { Pool } = require('pg');
const { authenticateUser } = require('../middleware/userAuth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Add review
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { product_id, rating, review_text } = req.body;
    
    // Check if user has purchased this product
    const purchaseCheck = await pool.query(`
      SELECT 1 FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status = 'delivered'
    `, [req.user.id, product_id]);
    
    if (purchaseCheck.rows.length === 0) {
      return res.status(400).json({ error: 'You can only review products you have purchased' });
    }

    // Add review
    await pool.query(
      'INSERT INTO reviews (product_id, user_id, rating, review_text, merchant_id) VALUES ($1, $2, $3, $4, $5)',
      [product_id, req.user.id, rating, review_text, req.merchantId]
    );

    // Update product rating
    const avgResult = await pool.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id = $1',
      [product_id]
    );
    
    await pool.query(
      'UPDATE products SET rating = $1, review_count = $2 WHERE id = $3',
      [parseFloat(avgResult.rows[0].avg_rating), parseInt(avgResult.rows[0].review_count), product_id]
    );

    res.json({ message: 'Review added successfully' });
  } catch (error) {
    if (error.constraint === 'reviews_product_id_user_id_key') {
      return res.status(400).json({ error: 'You have already reviewed this product' });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;