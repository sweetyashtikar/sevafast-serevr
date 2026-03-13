// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const qs = require('qs');
const { default: mongoose } = require('mongoose');
const Order = require('../models/orders');
const { PaymentStatus , OrderStatus} = require('../models/orders')
const session = require('mongoose')
const { TEZ_PAYMENT_API_KEY } = require('../env-variables')

// Generate TezGateway payment URL
router.post('/generate-payment-url/:order_id', async (req, res) => {
  let session = null;
  try {
    const order_id = req.params
    session = await mongoose.startSession();
    session.startTransaction();

    const { trans_id, amount, customer_mobile, customer_email, customer_name } = req.body;
    console.log("req.body of trnsaction start", req.body)

    // Validate input
    if (!trans_id || !amount || !customer_mobile) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'trans_id, amount, and customer_mobile are required'
      });
    }

    // ✅ CORRECT API URL - Use their working endpoint
    const TEZGATEWAY_API_URL = 'https://upi.tezindia.in/api/create-order';


    // ✅ CORRECT PARAMETER NAMES
    const formData = {
      user_token: TEZ_PAYMENT_API_KEY,           // ✅ Fixed: use 'user_token' not secret_key
      customer_mobile: customer_mobile,
      amount: amount,
      order_id: trans_id,
      redirect_url: 'https://yourdomain.com/payment/success', // ✅ Fixed: use 'redirect_url'
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

      // Commit transaction if everything is successful
      if (session) {
        await session.commitTransaction();
        session.endSession();
      }
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
      // Abort transaction on API error
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: response.data.message || 'Failed to generate payment URL',
        details: response.data.details || null
      });
    }

  } catch (error) {
    console.log("error", error)
    // Abort transaction on exception
    await session.abortTransaction();
    session.endSession();
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
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { order_id } = req.params;
    console.log("order_id", order_id)
    const { trans_id } = req.body;
    console.log("req.body of trnsaction start", req.body)

    // Validate input
    if (!trans_id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'transaction Id are required'
      });
    }


    const TEZ_PAYMENT_API_KEY = '0a97326de8679a25f056f04500409d36';
    const TEZGATEWAY_VERIFY_URL = 'https://upi.tezindia.in/api/check-order-status';

    const formData = {
      user_token: TEZ_PAYMENT_API_KEY,
      order_id: trans_id
    };
    console.log("formdata", formData)

    const response = await axios.post(TEZGATEWAY_VERIFY_URL, qs.stringify(formData), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });
    console.log("response verify", response)

    if (response.success === true && response.data.status === true) {
      await Order.findByIdAndUpdate(order_id, {
        'payment.status': PaymentStatus.PAID,
        'payment.paid_at': new Date(),
        status: OrderStatus.PLACED,
        'status_timestamps.placed': new Date()
      }, {
        session,
        new: true
      })


      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        data: response.data
      });
    } else {
      await Order.findByIdAndUpdate(order_id, {
        'payment.status': PaymentStatus.FAILED,
      }, { session })
      await session.commitTransaction(); // or abortTransaction() based on your logic
      session.endSession();


      return res.json({
        success: true,
        data: response.data
      });
    }

  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
});

module.exports = router;