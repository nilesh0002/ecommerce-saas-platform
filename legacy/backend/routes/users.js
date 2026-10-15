const express = require('express');
const { Pool } = require('pg');
const { authenticateAdmin } = require('../middleware/auth');
const { addMerchantFilter } = require('../middleware/tenant');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get all users
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const baseQuery = 'SELECT id, email, first_name, last_name, phone, is_active, created_at FROM users';
    const { query, params } = addMerchantFilter(req, baseQuery);
    
    const result = await pool.query(query + ' ORDER BY created_at DESC', params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle user active status
router.put('/:id/toggle-active', authenticateAdmin, async (req, res) => {
  try {
    const { query, params } = addMerchantFilter(req, 'UPDATE users SET is_active = NOT is_active WHERE id = $1', [req.params.id]);
    
    await pool.query(query, params);
    res.json({ message: 'User status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user orders
router.get('/:id/orders', authenticateAdmin, async (req, res) => {
  try {
    const baseQuery = 'SELECT * FROM orders WHERE user_id = $1';
    const { query, params } = addMerchantFilter(req, baseQuery, [req.params.id]);
    
    const result = await pool.query(query + ' ORDER BY created_at DESC', params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;