const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscriptionController");
const { authenticate, checkIfAdmin } = require("../middleware/authMiddleware");

router.get("/", subscriptionController.getAllSubscriptions);

// Protected routes (User)
router.post("/create-order", authenticate, subscriptionController.createSubscriptionOrder);
router.post("/verify", authenticate, subscriptionController.verifySubscriptionPayment);
router.post("/cancel", authenticate, subscriptionController.handleSubscriptionCancel);
router.get("/active-subscription", authenticate, subscriptionController.getActiveSubscription);

// Admin Protected routes
router.get("/admin/all", authenticate, checkIfAdmin, subscriptionController.adminGetAllSubscriptions);
router.post("/admin/create", authenticate, checkIfAdmin, subscriptionController.createSubscription);
router.put("/admin/update/:id", authenticate, checkIfAdmin, subscriptionController.updateSubscription);
router.delete("/admin/delete/:id", authenticate, checkIfAdmin, subscriptionController.deleteSubscription);

module.exports = router;
