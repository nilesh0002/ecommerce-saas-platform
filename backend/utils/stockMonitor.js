const cron = require('node-cron');
const { Pool } = require('pg');
const { sendLowStockAlert } = require('./emailService');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Check for low stock products and send alerts
 */
const checkLowStock = async () => {
  try {
    console.log('🔍 Running daily low stock check...');
    
    // Get all products with stock < 5 and stock > 0
    const result = await pool.query(`
      SELECT p.*, m.name as merchant_name, m.subdomain 
      FROM products p 
      LEFT JOIN merchants m ON p.merchant_id = m.id 
      WHERE p.stock < 5 AND p.stock > 0 
      ORDER BY p.stock ASC, p.name ASC
    `);

    if (result.rows.length > 0) {
      // Group products by merchant for separate emails
      const productsByMerchant = result.rows.reduce((acc, product) => {
        const merchantId = product.merchant_id || 'platform';
        if (!acc[merchantId]) {
          acc[merchantId] = {
            merchant: {
              id: product.merchant_id,
              name: product.merchant_name || 'Platform',
              subdomain: product.subdomain || 'admin'
            },
            products: []
          };
        }
        acc[merchantId].products.push(product);
        return acc;
      }, {});

      // Send alerts for each merchant
      for (const [merchantId, data] of Object.entries(productsByMerchant)) {
        try {
          await sendLowStockAlert(data.products);
          console.log(`✅ Low stock alert sent for merchant: ${data.merchant.name} (${data.products.length} products)`);
        } catch (emailError) {
          console.error(`❌ Failed to send low stock alert for merchant ${merchantId}:`, emailError);
        }
      }
      
      console.log(`📧 Daily low stock check completed. Total products: ${result.rows.length}`);
    } else {
      console.log('✅ No low stock products found. All inventory levels are healthy!');
    }
    
  } catch (error) {
    console.error('❌ Error during low stock check:', error);
  }
};

/**
 * Check for products that just went out of stock
 * This can be called when stock is updated
 */
const checkOutOfStock = async (productId) => {
  try {
    const result = await pool.query(`
      SELECT p.*, m.name as merchant_name 
      FROM products p 
      LEFT JOIN merchants m ON p.merchant_id = m.id 
      WHERE p.id = $1 AND p.stock = 0
    `, [productId]);

    if (result.rows.length > 0) {
      const product = result.rows[0];
      console.log(`🚨 Product out of stock detected: ${product.name}`);
      
      // This would trigger immediate email alert
      // (handled in the products route when stock is updated)
      return product;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error checking out of stock:', error);
    return null;
  }
};

/**
 * Get stock statistics for dashboard
 */
const getStockStatistics = async (merchantId = null) => {
  try {
    let query = `
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock,
        COUNT(CASE WHEN stock < 5 AND stock > 0 THEN 1 END) as low_stock,
        COUNT(CASE WHEN stock >= 5 THEN 1 END) as healthy_stock,
        AVG(stock) as average_stock
      FROM products
    `;
    
    let params = [];
    
    if (merchantId) {
      query += ' WHERE merchant_id = $1';
      params = [merchantId];
    }

    const result = await pool.query(query, params);
    
    return {
      totalProducts: parseInt(result.rows[0].total_products),
      outOfStock: parseInt(result.rows[0].out_of_stock),
      lowStock: parseInt(result.rows[0].low_stock),
      healthyStock: parseInt(result.rows[0].healthy_stock),
      averageStock: parseFloat(result.rows[0].average_stock) || 0
    };
    
  } catch (error) {
    console.error('❌ Error getting stock statistics:', error);
    return {
      totalProducts: 0,
      outOfStock: 0,
      lowStock: 0,
      healthyStock: 0,
      averageStock: 0
    };
  }
};

/**
 * Start the stock monitoring cron job
 */
const startStockMonitoring = () => {
  // Run daily at 9:00 AM
  cron.schedule('0 9 * * *', checkLowStock, {
    timezone: 'America/New_York' // Adjust timezone as needed
  });
  
  // Optional: Run weekly comprehensive stock report on Mondays at 8:00 AM
  cron.schedule('0 8 * * 1', async () => {
    console.log('📊 Running weekly stock report...');
    
    try {
      const stats = await getStockStatistics();
      console.log('Weekly Stock Report:', stats);
      
      // You could send a comprehensive weekly report here
      // await sendWeeklyStockReport(stats);
      
    } catch (error) {
      console.error('❌ Error generating weekly stock report:', error);
    }
  }, {
    timezone: 'America/New_York'
  });
  
  console.log('⏰ Stock monitoring cron jobs started:');
  console.log('   - Daily low stock alerts: 9:00 AM EST');
  console.log('   - Weekly stock reports: Monday 8:00 AM EST');
};

/**
 * Stop all cron jobs (useful for testing)
 */
const stopStockMonitoring = () => {
  cron.getTasks().forEach(task => task.stop());
  console.log('⏹️ Stock monitoring stopped');
};

module.exports = {
  startStockMonitoring,
  stopStockMonitoring,
  checkLowStock,
  checkOutOfStock,
  getStockStatistics
};