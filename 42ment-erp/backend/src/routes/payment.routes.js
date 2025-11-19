const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');

// TODO: 구현 예정
router.get('/', authenticate, (req, res) => {
  res.json({ success: true, data: [], message: 'Not implemented yet' });
});

module.exports = router;
