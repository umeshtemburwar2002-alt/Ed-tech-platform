import { supabase } from '../../config/supabaseClient';

/**
 * Create a Razorpay order on the backend.
 * @param {Array} cartItems - List of course objects being purchased.
 * @param {number} total - Total amount in INR.
 * @returns {Promise<{orderId:string, amount:number, currency:string}>}
 */
export const createOrder = async (cartItems, total) => {
  // For simplicity, we send the first course ID and total amount.
  // In a full implementation, you'd handle multiple items.
  const payload = {
    courseId: cartItems[0]?.id,
    amount: total,
  };
  const res = await fetch('/api/v1/payment/create-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    credentials: 'include', // send cookies/JWT
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create order: ${err}`);
  }
  const data = await res.json();
  // Expected: { orderId, amount, currency }
  return data;
};

/**
 * Verify Razorpay payment on the backend.
 * @param {string} orderId
 * @param {string} paymentId
 * @param {string} signature
 * @returns {Promise<any>}
 */
export const confirmPayment = async (orderId, paymentId, signature) => {
  const payload = {
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: signature,
    // Assuming single course for now, pass courseId again.
    courseId: null,
  };
  const res = await fetch('/api/v1/payment/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Payment verification failed: ${err}`);
  }
  return await res.json();
};
