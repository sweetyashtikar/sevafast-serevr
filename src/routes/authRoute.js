const auth = require('../controllers/auth')
const router = require('express').Router();
const { protect } = require('../middleware/protect');

// Login Route
router.post('/login', auth.LoginUser);

router.post('/forgotpassword', auth.ForgotPassword);

router.post('/verifyotp', auth.VerifyOTP);

router.post('/resetpassword', auth.resetPassword);

router.post('/logout',protect, auth.LogoutUser);

module.exports = router;