// routes/couponRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const couponController = require('../controllers/couponController');
const { protect, authorize } = require('../middleware/authMiddleware');
const {uploadCouponImages} = require('../middleware/uploadconfig');
const {authenticate} = require('../middleware/authMiddleware')

// ==================== VALIDATION RULES ====================

const couponValidationRules = () => {
    return [
        body('couponCode')
            .notEmpty().withMessage('Coupon code is required')
            .isLength({ min: 3, max: 20 }).withMessage('Coupon code must be between 3-20 characters')
            .matches(/^[A-Za-z0-9]+$/).withMessage('Coupon code can only contain letters and numbers'),
        
        body('title')
            .notEmpty().withMessage('Coupon title is required')
            .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
        
        body('description')
            .notEmpty().withMessage('Coupon description is required')
            .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
        
        body('couponType')
            .optional()
            .isIn(['single time valid', 'multiple time valid']).withMessage('Invalid coupon type'),
        
        body('userType')
            .optional()
            .isIn(['all', 'new', 'existing']).withMessage('Invalid user type'),
        
        body('discountType')
            .optional()
            .isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
        
        body('couponValue')
            .notEmpty().withMessage('Coupon value is required')
            .isNumeric().withMessage('Coupon value must be a number')
            .custom((value, { req }) => {
                if (req.body.discountType === 'percentage' && value > 100) {
                    throw new Error('Percentage discount cannot exceed 100%');
                }
                return true;
            }),
        
        body('minOrderAmount')
            .optional()
            .isNumeric().withMessage('Minimum order amount must be a number')
            .custom((value) => value >= 0).withMessage('Minimum order amount cannot be negative'),
        
        body('maxDiscountAmount')
            .optional()
            .isNumeric().withMessage('Maximum discount amount must be a number')
            .custom((value) => value >= 0).withMessage('Maximum discount amount cannot be negative'),
        
        body('expiryDate')
            .notEmpty().withMessage('Expiry date is required')
            .isISO8601().withMessage('Invalid expiry date format')
            .custom((value) => {
                if (new Date(value) < new Date()) {
                    throw new Error('Expiry date cannot be in the past');
                }
                return true;
            }),
        
        body('startDate')
            .optional()
            .isISO8601().withMessage('Invalid start date format'),
        
        body('totalUsageLimit')
            .optional()
            .isNumeric().withMessage('Total usage limit must be a number')
            .custom((value) => value >= 1).withMessage('Total usage limit must be at least 1'),
        
        body('perUserUsageLimit')
            .optional()
            .isNumeric().withMessage('Per user usage limit must be a number')
            .custom((value) => value >= 1).withMessage('Per user usage limit must be at least 1'),
        
        body('status')
            .optional()
            .isBoolean().withMessage('Status must be a boolean')
    ];
};

const validateCouponRules = () => {
    return [
        body('couponCode')
            .notEmpty().withMessage('Coupon code is required')
            .isLength({ min: 3 }).withMessage('Invalid coupon code'),
        
        body('orderAmount')
            .notEmpty().withMessage('Order amount is required')
            .isNumeric().withMessage('Order amount must be a number')
            .custom((value) => value > 0).withMessage('Order amount must be greater than 0'),
        
        body('userId')
            .optional()
            .isMongoId().withMessage('Invalid user ID format')
    ];
};

// ==================== PUBLIC ROUTES (No Auth Required) ====================
// These are typically not needed as coupons are usually protected

// ==================== USER ROUTES (Authenticated Users) ====================

// Validate coupon during checkout
router.post('/validate',
    validateCouponRules(),
    couponController.validateCoupon
);

// Get active coupons for current user
router.get('/active', authenticate, couponController.getActiveCoupons);

// ==================== ADMIN ROUTES ====================

// Apply protect and authorize middleware to all admin routes
// router.use(protect, authorize('admin', 'superadmin'));

// Coupon statistics
router.get('/stats', couponController.getCouponStats);

// Get all coupons with filters
router.get('/', couponController.getAllCoupons);

// Get single coupon by ID
router.get('/:id', couponController.getCouponById);

// Create new coupon
router.post('/',
    uploadCouponImages.single('image'),
    couponValidationRules(),
    couponController.createCoupon
);

// Update coupon
router.put('/:id',
    uploadCouponImages.single('image'),
    couponValidationRules(),
    couponController.updateCoupon
);

// Toggle coupon status
router.patch('/:id/status', couponController.toggleCouponStatus);

// Delete coupon
router.delete('/:id', couponController.deleteCoupon);

router.post('/bulk-delete', couponController.BulkCoupondelete);

router.patch('/bulk-status', couponController.BulkCouponStatus);

router.post('/validate-cart', authenticate , couponController.validateCouponForCart);


module.exports = router;