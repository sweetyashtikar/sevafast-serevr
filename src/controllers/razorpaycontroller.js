const RazorpayService = require("../services/razorpay.service");
const { rollbackCouponUsage } = require("../utils/coupon");
const { OrderStatus } = require("../models/orders");
const Order = require("../models/orders");

// 1. Create Order
const createOrder = async (req, res) => {
  try {
    const { amount, currency, receipt } = req.body;
    const order = await RazorpayService.createOrder(amount, currency, receipt);
    
    res.status(200).json({
      success: true,
      order,
      amount: order.amount
    });
  } catch (error) {
    console.error('Controller - Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
};

// 2. Verify Payment
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;
    
    const isAuthentic = await RazorpayService.verifyPayment(
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature
    );
    
    if (isAuthentic) {
      // Update Order Status in Database
      if (order_id) {
        await Order.findByIdAndUpdate(order_id, {
          "payment.status": "paid",
          "payment.transaction_id": razorpay_payment_id,
          "payment.paid_at": new Date(),
          "payment.gateway_response": {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
          },
          status: OrderStatus.PLACED // Transition from PENDING to PLACED
        });
      }

      res.status(200).json({
        success: true,
        message: 'Payment verified and order updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('Controller - Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment and updating order'
    });
  }
};

// 3. Get Payment Details
const getPaymentDetails = async (req, res) => {
  try {
    const payment = await RazorpayService.fetchPaymentDetails(req.params.paymentId);
    res.status(200).json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Controller - Error fetching payment details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment details'
    });
  }
};

// 4. Cancel Payment (Update Order to CANCELLED)
const cancelPayment = async (req, res) => {
  try {
    const { order_id, reason } = req.body;
    
    if (order_id) {
      await Order.findByIdAndUpdate(order_id, {
        status: OrderStatus.CANCELLED,
        "cancellation.reason": reason || "Payment cancelled by user",
        "cancellation.initiated_by": "customer",
        "cancellation.user_id": req.user?._id
      });
      
      // Rollback coupon usage if applied
      await rollbackCouponUsage(order_id);
    }

    res.status(200).json({
      success: true,
      message: 'Order marked as cancelled'
    });
  } catch (error) {
    console.error('Controller - Error cancelling payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status'
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentDetails,
  cancelPayment
};