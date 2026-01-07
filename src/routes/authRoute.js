const auth = require('../controllers/auth')
const router = require('express').Router();

// Login Route
router.post('/login', auth.LoginUser);
// Forgot Password Route
router.post('/forgotpassword', auth.ForgotPassword);
// Verify OTP Route
router.post('/verifyotp', auth.VerifyOTP);
// Reset Password Route
router.post('/resetpassword', auth.resetPassword);

module.exports = router;