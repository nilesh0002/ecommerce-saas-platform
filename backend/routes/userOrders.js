const express = require('express');
const { Pool } = require('pg');
const { authenticateUser } = require('../middleware/userAuth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get user orders
router.get('/', authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single order with items
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    // Get order
    const orderResult = await pool.query(`
      SELECT o.*, a.name as shipping_name, a.address_line1, a.city, a.state, a.pincode
      FROM orders o
      LEFT JOIN addresses a ON o.shipping_address_id = a.id
      WHERE o.id = $1 AND o.user_id = $2
    `, [req.params.id, req.user.id]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    
    // Get order items
    const itemsResult = await pool.query(`
      SELECT oi.*, p.name, p.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [req.params.id]);
    
    order.items = itemsResult.rows;
    order.shipping_address = {
      name: order.shipping_name,
      address_line1: order.address_line1,
      city: order.city,
      state: order.state,
      pincode: order.pincode
    };
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;