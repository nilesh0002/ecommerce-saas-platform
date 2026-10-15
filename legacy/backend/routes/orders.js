const express = require('express');
const { Pool } = require('pg');
const { authenticateAdmin } = require('../middleware/auth');
const { addMerchantFilter } = require('../middleware/tenant');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get all orders
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let baseQuery = `
      SELECT o.*, u.first_name, u.last_name, u.email,
             COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
    `;
    
    let params = [];
    if (status) {
      baseQuery += ` WHERE o.status = $1`;
      params.push(status);
    }
    
    const { query, params: finalParams } = addMerchantFilter(req, baseQuery, params);
    const result = await pool.query(query + ` GROUP BY o.id, u.first_name, u.last_name, u.email ORDER BY o.created_at DESC`, finalParams);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const { query, params } = addMerchantFilter(req, 'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, req.params.id]);
    
    await pool.query(query, params);
    res.json({ message: 'Order updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;