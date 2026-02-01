// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const razorpay = require("../config/razorpay");
const dotenv = require('dotenv');
dotenv.config();



// 1. Create Order Route
router.post('/create-order', async (req, res) => {
    console.log('Razorpay Key ID in Controller:', process.env.RAZORPAY_KEY_ID); 

  try {
    const { amount, currency = 'INR' } = req.body;
    
    const options = {
      amount: amount , // Amount in paise (multiply by 100 for rupees)
      currency,
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1 // Auto capture payment
    };

    const order = await razorpay.orders.create(options);
    
    res.status(200).json({
      success: true,
      order,
      amount: options.amount
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
});

// 2. Verify Payment Route
router.post('/verify-payment', async (req, res) => {
  try {
    const crypto = require('crypto');
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
    
    const isAuthentic = expectedSignature === razorpay_signature;
    
    if (isAuthentic) {
      // Payment is successful
      // Save payment details to your database here
      
      res.status(200).json({
        success: true,
        message: 'Payment verified successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment'
    });
  }
});

// 3. Get Payment Details
router.get('/payment/:paymentId', async (req, res) => {
  try {
    const payment = await razorpay.payments.fetch(req.params.paymentId);
    res.status(200).json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment details'
    });
  }
});

module.exports = router;