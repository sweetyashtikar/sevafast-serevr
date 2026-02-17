const express = require("express");
const router = express.Router();
const {
  createReturnRequest,
  getReturnRequests,
  getReturnRequestById,
  updateReturnRequestStatus,
  updateReturnRequest,
  cancelReturnRequest,
  getReturnStats,
} = require("../controllers/returnRequest");

const { authenticate, checkIfAdmin } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authenticate);

// Stats route (admin only)
router.get("/stats", checkIfAdmin, getReturnStats);

// Main CRUD routes
router.route("/")
  .post(createReturnRequest)
  .get(getReturnRequests);

router.route("/:id")
  .get(getReturnRequestById)
  .patch(updateReturnRequest) // User update (remarks only)
  .delete(cancelReturnRequest); // User cancel

// Admin status update route
router.patch("/:id/status", checkIfAdmin, updateReturnRequestStatus);

module.exports = router;