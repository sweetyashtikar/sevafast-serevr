// routes/deliveryBoyRoutes.js
const express = require('express');
const router = express.Router();
const {createDeliveryBoyProfile,
    uploadDeliveryBoyProfile,
    getVendorDeliveryBoys,
    getDeliveryBoyById,
    getDeliveryBoyByUserId,
  
    updateDeliveryBoy,
    updateStatus,
    updateLocation,
    updateAvailability,
    verifyDocuments,
    deleteDeliveryBoy,
    permanentDelete} = require('../controllers/deliveryBoy');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// ============ VENDOR ROUTES ============
// Get all delivery boys for a vendor
router.get(
  '/vendor/:vendorId', 
//   authorize('admin', 'vendor', 'super_admin'), 
  getVendorDeliveryBoys
);

// Create delivery boy profile (if not created during registration)
router.post(
  '/', 
//   authorize('admin', 'vendor', 'super_admin'), 
  uploadDeliveryBoyProfile
);

// ============ DELIVERY BOY ROUTES ============
// Get delivery boy by ID
router.get(
  '/:id', 
//   authorize('admin', 'vendor', 'delivery_boy', 'super_admin'),
 getDeliveryBoyById
);

// Get delivery boy by user ID
router.get(
  '/user/:userId', 
//   authorize('admin', 'vendor', 'delivery_boy', 'super_admin'),
getDeliveryBoyByUserId
);

// Update delivery boy profile
router.put(
  '/:id', 
  authorize('admin', 'vendor', 'delivery_boy', 'super_admin'),
 updateDeliveryBoy
);

// Update delivery boy status (active/inactive)
router.patch(
  '/:id/status', 
  authorize('admin', 'vendor', 'super_admin'),
 updateStatus
);

// Update delivery boy location
router.patch(
  '/:id/location', 
  authorize('delivery_boy', 'admin'),
 updateLocation
);

// Update availability status
router.patch(
  '/:id/availability', 
  authorize('delivery_boy', 'admin', 'vendor'),
 updateAvailability
);

// Verify documents (admin only)
router.patch(
  '/:id/verify', 
  authorize('admin', 'super_admin'),
 verifyDocuments
);

// Soft delete (deactivate)
router.delete(
  '/:id', 
//   authorize('admin', 'vendor', 'super_admin'),
deleteDeliveryBoy
);

// Permanent delete (admin only)
router.delete(
  '/:id/permanent', 
//   authorize('admin', 'super_admin'),
  permanentDelete
);

module.exports = router;