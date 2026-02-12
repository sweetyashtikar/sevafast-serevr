// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const qs = require('qs');

// Generate TezGateway payment URL
router.post('/generate-payment-url', async (req, res) => {
  try {
    const { order_id, amount, customer_mobile, customer_email, customer_name } = req.body;
    console.log("Payment request:", req.body);
    
    // Validate input
    if (!order_id || !amount || !customer_mobile) {
      return res.status(400).json({
        success: false,
        message: 'order_id, amount, and customer_mobile are required'
      });
    }

    // ✅ CORRECT API URL - Use their working endpoint
    const TEZGATEWAY_API_URL = 'https://upi.tezindia.in/api/create-order';
    
    // ✅ CORRECT API KEY - Use the one from their example
    const USER_TOKEN = '0a97326de8679a25f056f04500409d36';

    // ✅ CORRECT PARAMETER NAMES
    const formData = {
      user_token: USER_TOKEN,           // ✅ Fixed: use 'user_token' not secret_key
      customer_mobile: customer_mobile,
      amount: amount,
      order_id: order_id,
    //   redirect_url: 'https://yourdomain.com/payment/success', // ✅ Fixed: use 'redirect_url'
    //   remark1: customer_name || 'Order payment',
    //   remark2: customer_email || 'no-email@example.com'
    };

    console.log("Sending to TezGateway:", formData);

    // Send request to TezGateway
    const response = await axios.post(TEZGATEWAY_API_URL, qs.stringify(formData), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });
    
    console.log("TezGateway Response:", response.data);

    // ✅ CORRECT RESPONSE CHECK - status is boolean
    if (response.data && response.data.status === true) {
      return res.json({
        success: true,
        message: 'Payment URL generated',
        data: {
          payment_url: response.data.result?.payment_url,
          order_id: response.data.result?.orderId || order_id,
          qr_image: response.data.result?.data?.qr_image,
          upi_intent_links: response.data.result?.data,
          method: response.data.result?.method
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: response.data.message || 'Failed to generate payment URL',
        details: response.data.details || null
      });
    }

  } catch (error) {
    console.error('TezGateway API error:', error.response?.data || error.message);
    
    return res.status(500).json({
      success: false,
      message: 'Payment gateway error',
      error: error.response?.data || error.message
    });
  }
});

// Verify payment status
router.get('/verify-payment/:order_id', async (req, res) => {
  try {
    const { order_id } = req.params;
    
    const TEZGATEWAY_SECRET_KEY = process.env.TEZGATEWAY_SECRET_KEY;
    const TEZGATEWAY_VERIFY_URL = 'https://upi.tezindia.in/api/verify-payment';
    
    const formData = {
      secret_key: TEZGATEWAY_SECRET_KEY,
      order_id: order_id
    };

    const response = await axios.post(TEZGATEWAY_VERIFY_URL, qs.stringify(formData), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
});

module.exports = router;