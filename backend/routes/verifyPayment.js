const express = require('express');
const router = express.Router();
const crypto = require('crypto');

router.post('/', (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature === razorpay_signature) {
    return res.json({ success: true, message: 'Payment verified' });
  }
  return res.status(400).json({ success: false, message: 'Invalid signature' });
});

module.exports = router;
