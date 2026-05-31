// backend/routes/cart.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseAdmin');

// GET cart items for authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthenticated' });
    const { data, error } = await supabase.from('cart').select('*').eq('student_id', userId);
    if (error) throw error;
    return res.json({ success: true, cart: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

// POST add item to cart
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthenticated' });
    const { course_id } = req.body;
    const { error } = await supabase.from('cart').insert({ student_id: userId, course_id });
    if (error) throw error;
    return res.json({ success: true, message: 'Item added' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE remove item
router.delete('/:itemId', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthenticated' });
    const { itemId } = req.params;
    const { error } = await supabase.from('cart').delete().eq('id', itemId).eq('student_id', userId);
    if (error) throw error;
    return res.json({ success: true, message: 'Item removed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
