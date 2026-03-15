const express = require('express');
const router = express.Router();
const { 
    createOrder, 
    verifyPayment, 
    getPaymentDetails,
    cancelPayment
} = require('../controllers/razorpaycontroller');

router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);
router.post('/cancel-payment', cancelPayment);
router.get('/payment/:paymentId', getPaymentDetails);

module.exports = router;
