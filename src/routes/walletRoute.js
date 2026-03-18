const express = require('express');
const router = express.Router();
const { getMyWallet, getTransactions } = require('../controllers/walletController');
const { authenticate } = require('../middleware/authMiddleware');

// GET /api/wallet/me - Get current user's wallet and level info
router.get('/me', authenticate, getMyWallet);

// GET /api/wallet/transactions - Get current user's wallet transactions
router.get('/transactions', authenticate, getTransactions);

module.exports = router;
