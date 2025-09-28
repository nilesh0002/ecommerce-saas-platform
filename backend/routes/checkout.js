const express = require('express');
const { Pool } = require('pg');
const { createOrder, verifyPayment } = require('../controllers/paymentController');
const { extractMerchant } = require('../middleware/tenant');
const { authenticateUser } = require('../middleware/userAuth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get cart items
router.get('/cart', authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ci.*, p.name, p.price, p.image_url, p.stock 
      FROM cart_items ci 
      JOIN products p ON ci.product_id = p.id 
      WHERE ci.user_id = $1
    `, [req.user.id]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add to cart
router.post('/cart', authenticateUser, extractMerchant, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    await pool.query(`
      INSERT INTO cart_items (user_id, product_id, quantity, merchant_id) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, product_id) 
      DO UPDATE SET quantity = cart_items.quantity + $3
    `, [req.user.id, productId, quantity, req.merchantId]);
    
    res.json({ message: 'Added to cart' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update cart item
router.put('/cart/:productId', authenticateUser, async (req, res) => {
  try {
    const { quantity } = req.body;
    
    if (quantity <= 0) {
      await pool.query('DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2', 
        [req.user.id, req.params.productId]);
    } else {
      await pool.query('UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND product_id = $3', 
        [quantity, req.user.id, req.params.productId]);
    }
    
    res.json({ message: 'Cart updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user addresses
router.get('/addresses', authenticateUser, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC', 
      [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add address
router.post('/addresses', authenticateUser, async (req, res) => {
  try {
    const { name, phone, address_line1, address_line2, city, state, pincode, is_default } = req.body;
    
    if (is_default) {
      await pool.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    }
    
    const result = await pool.query(`
      INSERT INTO addresses (user_id, name, phone, address_line1, address_line2, city, state, pincode, is_default)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `, [req.user.id, name, phone, address_line1, address_line2, city, state, pincode, is_default]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create payment order
router.post('/create-order', authenticateUser, createOrder);

// Verify payment
router.post('/verify-payment', authenticateUser, verifyPayment);

module.exports = router;