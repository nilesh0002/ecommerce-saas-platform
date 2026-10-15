const express = require('express');
const { Pool } = require('pg');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Middleware to ensure super admin access
const requireSuperAdmin = (req, res, next) => {
  if (req.admin?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

// Get all merchants (super admin only)
router.get('/', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM merchants ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new merchant (super admin only)
router.post('/', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { name, subdomain, email, phone, plan } = req.body;
    
    const result = await pool.query(
      'INSERT INTO merchants (name, subdomain, email, phone, plan) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, subdomain, email, phone, plan || 'basic']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle merchant active status (super admin only)
router.put('/:id/toggle-active', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE merchants SET is_active = NOT is_active WHERE id = $1', [req.params.id]);
    res.json({ message: 'Merchant status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;