const express = require('express');
const router = express.Router();
const userPermissionController = require('../controllers/userPermission');

// Import authentication and authorization middleware
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// Only users with 'user_permissions' permission can access these routes
// router.use(authorize('admin', 'super-admin')); // Adjust roles as needed

// CRUD Operations
router.post('/', userPermissionController.createUserPermission);
router.get('/', userPermissionController.getAllUserPermissions);
router.get('/:id', userPermissionController.getUserPermissionById);
router.put('/:id', userPermissionController.updateUserPermission);
router.delete('/:id', userPermissionController.deleteUserPermission);

// User-specific operations
router.get('/user/:userId', userPermissionController.getUserPermissionByUserId);
router.put('/user/:userId/permissions', userPermissionController.updateSpecificPermissions);
router.delete('/user/:userId', userPermissionController.deleteUserPermissionByUserId);

// Permission checking
router.get('/check/:userId', userPermissionController.checkUserPermission);
router.get('/users/with-permission', userPermissionController.getUsersWithPermission);

module.exports = router;