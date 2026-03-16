const Subscription = require("../models/subscription");
const UserSubscription = require("../models/userSubscription");
const Payment = require("../models/payment");
const RazorpayService = require("../services/razorpay.service");

/**
 * Get all active subscription plans
 */
exports.getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ isActive: true });
    res.status(200).json({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscriptions",
      error: error.message,
    });
  }
};

/**
 * Create a Razorpay order for a subscription
 */
exports.createSubscriptionOrder = async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role?.role; // 'client', 'vendor', 'admin', etc.

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }

    // Role Restriction: Customer can only buy 'customer' type, Vendor can only buy 'vendor' type
    const isCustomerRole = userRole === "customer";
    
    if (subscription.type === "customer" && !isCustomerRole) {
      return res.status(403).json({
        success: false,
        message: "This plan is for customers only.",
      });
    }
    if (subscription.type === "vendor" && userRole !== "vendor") {
      return res.status(403).json({
        success: false,
        message: "This plan is for vendors only.",
      });
    }

    // Create Razorpay order - Shortened receipt to stay under 40 chars
    const order = await RazorpayService.createOrder(
      subscription.price,
      "INR",
      `sub_${Date.now()}`
    );

    // Initial Payment entry
    const payment = new Payment({
      userId,
      subscriptionId,
      razorpayOrderId: order.id,
      amount: subscription.price,
      paymentType: "subscription",
      status: "pending",
    });

    await payment.save();

    res.status(200).json({
      success: true,
      order,
      subscription,
    });
  } catch (error) {
    console.error("Create subscription order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create subscription order",
      error: error.message,
    });
  }
};

/**
 * Verify subscription payment and activate
 */
exports.verifySubscriptionPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user._id;

    const isAuthentic = await RazorpayService.verifyPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isAuthentic) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "captured",
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    const subscription = await Subscription.findById(payment.subscriptionId);
    
    // Activate or Update user subscription
    const durationDays = subscription.type === "customer" ? 30 : 365;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    await UserSubscription.findOneAndUpdate(
      { userId, status: "active" },
      { status: "expired" }
    );

    const newUserSub = new UserSubscription({
      userId,
      subscriptionId: payment.subscriptionId,
      endDate,
      status: "active",
    });

    await newUserSub.save();

    res.status(200).json({
      success: true,
      message: "Subscription activated successfully",
      data: newUserSub,
    });
  } catch (error) {
    console.error("Verify subscription payment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify subscription payment",
      error: error.message,
    });
  }
};

/**
 * Handle subscription payment cancellation
 */
exports.handleSubscriptionCancel = async (req, res) => {
  try {
    const { razorpay_order_id } = req.body;
    
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { status: "cancelled" }
    );

    res.status(200).json({
      success: true,
      message: "Payment cancellation logged",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to log cancellation",
      error: error.message,
    });
  }
};

/**
 * Get the current active subscription for the logged-in user
 */
exports.getActiveSubscription = async (req, res) => {
  try {
    const userId = req.user._id;

    const activeSub = await UserSubscription.findOne({
      userId,
      status: "active",
    }).populate("subscriptionId");

    if (!activeSub) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      data: activeSub,
    });
  } catch (error) {
    console.error("Get active subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active subscription",
      error: error.message,
    });
  }
};
