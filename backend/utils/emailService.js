const nodemailer = require('nodemailer');

/**
 * Create email transporter with Gmail SMTP
 */
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // App password for Gmail
    },
    secure: true,
    port: 465,
  });
};

/**
 * Send out of stock alert email
 * @param {Object} product - Product that went out of stock
 */
const sendOutOfStockAlert = async (product) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: 'E-commerce Platform',
        address: process.env.EMAIL_USER
      },
      to: process.env.ADMIN_EMAIL,
      subject: '🚨 URGENT: Product Out of Stock',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🚨 URGENT: Product Out of Stock</h1>
          </div>
          
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #991b1b; margin-top: 0;">Product Details:</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Product Name:</td>
                <td style="padding: 8px 0; color: #111827;">${product.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Product ID:</td>
                <td style="padding: 8px 0; color: #111827;">#${product.id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Category:</td>
                <td style="padding: 8px 0; color: #111827;">${product.category || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Price:</td>
                <td style="padding: 8px 0; color: #111827;">$${parseFloat(product.price).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Current Stock:</td>
                <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">0 units</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border: 1px solid #e5e7eb; margin-top: 20px; border-radius: 8px;">
            <h3 style="color: #dc2626; margin-top: 0;">⚡ Action Required:</h3>
            <p style="margin: 10px 0;">This product is now completely out of stock. Please take immediate action to:</p>
            <ul style="color: #374151; line-height: 1.6;">
              <li>Restock the product immediately</li>
              <li>Update product availability status</li>
              <li>Notify customers about restocking timeline</li>
              <li>Consider promoting alternative products</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This is an automated alert from your E-commerce SaaS Platform<br>
              Sent on ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Out of stock alert sent for product: ${product.name}`);
    
  } catch (error) {
    console.error('❌ Failed to send out of stock alert:', error);
    throw error;
  }
};

/**
 * Send low stock summary email
 * @param {Array} products - Array of low stock products
 */
const sendLowStockAlert = async (products) => {
  try {
    if (!products || products.length === 0) {
      return;
    }

    const transporter = createTransporter();
    
    const productList = products.map(p => 
      `<tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; font-weight: 500;">${p.name}</td>
        <td style="padding: 12px; text-align: center; color: ${p.stock === 0 ? '#dc2626' : '#d97706'}; font-weight: bold;">
          ${p.stock} ${p.stock === 1 ? 'unit' : 'units'}
        </td>
        <td style="padding: 12px; text-align: center;">$${parseFloat(p.price).toFixed(2)}</td>
        <td style="padding: 12px;">${p.category || 'N/A'}</td>
      </tr>`
    ).join('');
    
    const mailOptions = {
      from: {
        name: 'E-commerce Platform',
        address: process.env.EMAIL_USER
      },
      to: process.env.ADMIN_EMAIL,
      subject: `⚠️ Low Stock Alert - ${products.length} Products Need Attention`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #d97706, #f59e0b); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">⚠️ Low Stock Alert</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Daily inventory report</p>
          </div>
          
          <div style="background-color: #fffbeb; border: 1px solid #fed7aa; padding: 20px; border-radius: 0 0 8px 8px;">
            <p style="margin-top: 0; color: #92400e; font-size: 16px;">
              <strong>${products.length}</strong> product${products.length !== 1 ? 's are' : ' is'} running low on stock (less than 5 units):
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Product Name</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Stock</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Price</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Category</th>
                </tr>
              </thead>
              <tbody>
                ${productList}
              </tbody>
            </table>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border: 1px solid #e5e7eb; margin-top: 20px; border-radius: 8px;">
            <h3 style="color: #d97706; margin-top: 0;">📋 Recommended Actions:</h3>
            <ul style="color: #374151; line-height: 1.6;">
              <li>Review and reorder products with critical stock levels</li>
              <li>Update product availability on your website</li>
              <li>Consider bulk ordering for frequently sold items</li>
              <li>Set up automatic reorder points for popular products</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This is your daily low stock report from E-commerce SaaS Platform<br>
              Generated on ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Low stock alert sent for ${products.length} products`);
    
  } catch (error) {
    console.error('❌ Failed to send low stock alert:', error);
    throw error;
  }
};

/**
 * Send order status update email to customer
 * @param {Object} order - Order object
 * @param {Object} customer - Customer object
 */
const sendOrderStatusUpdate = async (order, customer) => {
  try {
    const transporter = createTransporter();
    
    const statusColors = {
      pending: '#f59e0b',
      shipped: '#3b82f6',
      delivered: '#10b981'
    };
    
    const statusEmojis = {
      pending: '⏳',
      shipped: '🚚',
      delivered: '✅'
    };
    
    const mailOptions = {
      from: {
        name: 'E-commerce Platform',
        address: process.env.EMAIL_USER
      },
      to: customer.email,
      subject: `${statusEmojis[order.status]} Order Update - #${order.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${statusColors[order.status]}, ${statusColors[order.status]}dd); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">${statusEmojis[order.status]} Order Status Updated</h1>
          </div>
          
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px;">
            <p>Hi ${customer.name},</p>
            <p>Your order status has been updated:</p>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong>Order ID:</strong> #${order.id}</p>
              <p><strong>Status:</strong> <span style="color: ${statusColors[order.status]}; font-weight: bold; text-transform: uppercase;">${order.status}</span></p>
              <p><strong>Total Amount:</strong> $${parseFloat(order.total_amount).toFixed(2)}</p>
              <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
            </div>
            
            <p>Thank you for your business!</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Order status update sent to ${customer.email} for order #${order.id}`);
    
  } catch (error) {
    console.error('❌ Failed to send order status update:', error);
    throw error;
  }
};

module.exports = {
  sendOutOfStockAlert,
  sendLowStockAlert,
  sendOrderStatusUpdate
};