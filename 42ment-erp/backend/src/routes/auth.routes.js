const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const authValidation = require('../validators/auth.validator');

/**
 * @route   POST /v1/auth/login
 * @desc    로그인
 * @access  Public
 */
router.post('/login', validate(authValidation.login), authController.login);

/**
 * @route   POST /v1/auth/logout
 * @desc    로그아웃
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /v1/auth/change-password
 * @desc    비밀번호 변경
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  validate(authValidation.changePassword),
  authController.changePassword
);

module.exports = router;
