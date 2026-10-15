const express = require('express');
const { Pool } = require('pg');
const { authenticateAdmin } = require('../middleware/auth');
const { addMerchantFilter } = require('../middleware/tenant');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get dashboard statistics
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    // Total sales
    const salesQuery = addMerchantFilter(req, 'SELECT COALESCE(SUM(total_amount), 0) as total_sales FROM orders WHERE status != $1', ['cancelled']);
    const salesResult = await pool.query(salesQuery.query, salesQuery.params);
    
    // Total orders
    const ordersQuery = addMerchantFilter(req, 'SELECT COUNT(*) as total_orders FROM orders');
    const ordersResult = await pool.query(ordersQuery.query, ordersQuery.params);
    
    // Total users
    const usersQuery = addMerchantFilter(req, 'SELECT COUNT(*) as total_users FROM users WHERE is_active = true');
    const usersResult = await pool.query(usersQuery.query, usersQuery.params);
    
    // Low stock products
    const stockQuery = addMerchantFilter(req, 'SELECT COUNT(*) as low_stock_count FROM products WHERE stock < 5 AND is_active = true');
    const stockResult = await pool.query(stockQuery.query, stockQuery.params);
    
    res.json({
      totalSales: parseFloat(salesResult.rows[0].total_sales),
      totalOrders: parseInt(ordersResult.rows[0].total_orders),
      totalUsers: parseInt(usersResult.rows[0].total_users),
      lowStockCount: parseInt(stockResult.rows[0].low_stock_count)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;