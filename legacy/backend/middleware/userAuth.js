const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user details
    const result = await pool.query('SELECT id, email, first_name, last_name, merchant_id FROM users WHERE id = $1 AND is_active = true', [decoded.id]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token or user not found' });
    }

    req.user = result.rows[0];
    req.merchantId = result.rows[0].merchant_id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { authenticateUser };