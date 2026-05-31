// backend/routes/notifications.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseAdmin');

// GET notifications for authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthenticated' });
    const { data, error } = await supabase.from('notifications').select('*').eq('student_id', userId);
    if (error) throw error;
    return res.json({ success: true, notifications: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
