const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate admin users
 * Verifies JWT token and checks admin role
 */
const authenticateAdmin = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user has admin role
    if (!['admin', 'super_admin'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Attach admin info to request object
    req.admin = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      merchantId: decoded.merchantId
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to check if user is super admin
 */
const requireSuperAdmin = (req, res, next) => {
  if (req.admin.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

module.exports = { authenticateAdmin, requireSuperAdmin };