const express = require('express');
const crypto = require('crypto');
const { Pool } = require('pg');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Razorpay webhook
router.post('/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.get('X-Razorpay-Signature');
    const body = req.body;

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(body);

    // Handle payment events
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      
      await pool.query(
        'UPDATE payments SET status = $1 WHERE razorpay_payment_id = $2',
        ['paid', payment.id]
      );
      
      console.log(`Payment captured: ${payment.id}`);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;