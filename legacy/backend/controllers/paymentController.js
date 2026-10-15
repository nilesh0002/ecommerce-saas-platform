const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  } catch (error) {
    console.warn('Warning: Failed to initialize Razorpay:', error.message);
  }
} else {
  console.warn('Warning: Razorpay credentials not configured. Payment features will be disabled.');
}

// Create Razorpay order
const createOrder = async (req, res) => {
  if (!razorpay) {
    return res.status(503).json({ 
      error: 'Payment service not configured. Please configure Razorpay credentials.' 
    });
  }
  
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt,
    };

    const order = await razorpay.orders.create(options);
    
    // Save payment record
    await pool.query(
      'INSERT INTO payments (razorpay_order_id, amount, currency, status) VALUES ($1, $2, $3, $4)',
      [order.id, amount, currency, 'created']
    );

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
};

// Verify payment and create order
const verifyPayment = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;
    
    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Update payment record
    await client.query(
      'UPDATE payments SET razorpay_payment_id = $1, razorpay_signature = $2, status = $3 WHERE razorpay_order_id = $4',
      [razorpay_payment_id, razorpay_signature, 'paid', razorpay_order_id]
    );

    // Create order
    const orderResult = await client.query(
      'INSERT INTO orders (user_id, merchant_id, total_amount, shipping_address_id, status, payment_method) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [orderData.userId, orderData.merchantId, orderData.totalAmount, orderData.addressId, 'confirmed', 'razorpay']
    );

    const orderId = orderResult.rows[0].id;

    // Add order items and update stock
    for (const item of orderData.items) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.productId, item.quantity, item.price]
      );
      
      const stockResult = await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING stock',
        [item.quantity, item.productId]
      );
      
      if (stockResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Insufficient stock for product ${item.productId}` });
      }
    }

    // Clear cart
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [orderData.userId]);

    // Link payment to order
    await client.query(
      'UPDATE payments SET order_id = $1 WHERE razorpay_order_id = $2',
      [orderId, razorpay_order_id]
    );

    await client.query('COMMIT');
    res.json({ success: true, orderId, message: 'Payment verified and order created' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  } finally {
    client.release();
  }
};

module.exports = { createOrder, verifyPayment };