const express = require('express');
const router = express.Router();
const razorpayInstance = require('../config/razorpay');

router.post('/', async (req, res) => {
  const { amount, currency = 'INR', receipt, notes } = req.body;
  if (!amount || amount < 100) {
    return res.status(400).json({ success: false, message: 'Amount must be at least 100 paise' });
  }
  try {
    const order = await razorpayInstance.orders.create({ amount, currency, receipt, notes });
    res.json({ success: true, order_id: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
