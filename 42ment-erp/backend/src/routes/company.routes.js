const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');

// TODO: 회사 정보 관리 라우트 구현
router.get('/info', authenticate, (req, res) => {
  res.json({ success: true, data: {}, message: 'Not implemented yet' });
});

module.exports = router;
