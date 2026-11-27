const express = require('express');
const router = express.Router();
const { register, login, logout, googleLogin, googleMobileAuthPage, getMe, getLoginActivity, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/google/mobile', googleMobileAuthPage);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.get('/login-activity', protect, getLoginActivity);

module.exports = router;
