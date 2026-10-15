const { Pool } = require('pg');

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Middleware to extract merchant from subdomain and set tenant context
 * Supports multi-tenant architecture with subdomain-based isolation
 */
const extractMerchant = async (req, res, next) => {
  try {
    const host = req.get('host');
    
    // Skip tenant resolution for localhost or admin subdomain
    if (host.includes('localhost') || host.startsWith('admin.')) {
      req.isSuperAdmin = true;
      return next();
    }

    // Extract subdomain (e.g., 'store1' from 'store1.platform.com')
    const subdomain = host.split('.')[0];
    
    if (!subdomain) {
      return res.status(400).json({ error: 'Invalid subdomain' });
    }

    // Find merchant by subdomain
    const result = await pool.query(
      'SELECT id, name, subdomain, is_active FROM merchants WHERE subdomain = $1',
      [subdomain]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const merchant = result.rows[0];
    
    // Check if merchant is active
    if (!merchant.is_active) {
      return res.status(403).json({ error: 'Merchant account is inactive' });
    }

    // Set tenant context
    req.merchant = merchant;
    req.merchantId = merchant.id;
    req.isSuperAdmin = false;
    
    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({ error: 'Tenant resolution failed' });
  }
};

/**
 * Helper function to add merchant filter to database queries
 * Ensures data isolation between tenants
 */
const addMerchantFilter = (req, baseQuery, params = []) => {
  // Super admins can access all data
  if (req.isSuperAdmin || req.admin?.role === 'super_admin') {
    return { query: baseQuery, params };
  }
  
  // Regular admins only see their merchant's data
  const merchantId = req.merchantId || req.admin?.merchantId;
  
  if (!merchantId) {
    throw new Error('Merchant ID not found in request context');
  }
  
  // Add merchant_id filter to WHERE clause
  const merchantFilter = baseQuery.toLowerCase().includes('where') 
    ? ` AND merchant_id = $${params.length + 1}`
    : ` WHERE merchant_id = $${params.length + 1}`;
    
  return {
    query: baseQuery + merchantFilter,
    params: [...params, merchantId]
  };
};

/**
 * Middleware to validate merchant access for admin users
 */
const validateMerchantAccess = (req, res, next) => {
  // Super admins have access to everything
  if (req.admin?.role === 'super_admin') {
    return next();
  }
  
  // Regular admins can only access their own merchant's data
  if (req.merchantId && req.admin?.merchantId && req.merchantId !== req.admin.merchantId) {
    return res.status(403).json({ error: 'Access denied to this merchant' });
  }
  
  next();
};

module.exports = { 
  extractMerchant, 
  addMerchantFilter, 
  validateMerchantAccess 
};