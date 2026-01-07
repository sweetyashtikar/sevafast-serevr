const auth = require('../controllers/auth')
const router = require('express').Router();

// Login Route
router.post('/login', auth.LoginUser);
// Forgot Password Route
router.post('/forgotpassword', auth.ForgotPassword);

module.exports = router;