// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Custom Notifications
router.post('/custom', notificationController.createCustomNotification);
router.get('/custom', notificationController.getCustomNotifications);

// Delivery Boy Notifications
router.post('/delivery-boy', notificationController.createDeliveryBoyNotification);
router.get('/delivery-boy', notificationController.getDeliveryBoyNotifications);
router.put('/delivery-boy/:id/read', notificationController.markDeliveryBoyNotificationRead);

// General Notifications
router.post('/', notificationController.createNotification);
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', notificationController.markAsRead);

// System Notifications
router.post('/system', notificationController.createSystemNotification);
router.get('/system', notificationController.getSystemNotifications);

module.exports = router;