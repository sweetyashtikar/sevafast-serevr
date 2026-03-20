const express = require('express');
const router = express.Router();
const { getOrders, updateStatus, uploadImage } = require('../controllers/deliveryController');
const { authenticate } = require('../middleware/authMiddleware');
const { uploadDeliveryConfirmation } = require('../middleware/uploadconfig');

// All delivery routes require authentication
router.use(authenticate);

// GET /api/delivery/orders
router.get('/orders', getOrders);

// PATCH /api/delivery/orders/:id/status
router.patch('/orders/:id/status', updateStatus);

// POST /api/delivery/upload-image
router.post('/upload-image', uploadDeliveryConfirmation.single('image'), uploadImage);

module.exports = router;

