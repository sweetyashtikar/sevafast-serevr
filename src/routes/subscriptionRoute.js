const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscriptionController");
const { authenticate } = require("../middleware/authMiddleware");

router.get("/", subscriptionController.getAllSubscriptions);

// Protected routes
router.post("/create-order", authenticate, subscriptionController.createSubscriptionOrder);
router.post("/verify", authenticate, subscriptionController.verifySubscriptionPayment);
router.post("/cancel", authenticate, subscriptionController.handleSubscriptionCancel);
router.get("/active-subscription", authenticate, subscriptionController.getActiveSubscription);

module.exports = router;
