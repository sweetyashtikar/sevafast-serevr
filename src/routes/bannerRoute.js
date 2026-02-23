// routes/bannerRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const banner = require('../controllers/bannerController');
const { protect, authorize } = require('../middleware/authMiddleware');
const {uploadBannerImages} = require('../middleware/uploadconfig')

// Validation rules
const bannerValidationRules = () => {
    console.log("body", body)
    return [
        body('bannerType')
            .isIn(['deal of the day', 'home', 'header', 'footer', 'coupons', 
                   'about us', 'category', 'products', 'contact us'])
            .withMessage('Invalid banner type'),
        body('image')
            .notEmpty()
            .withMessage('Image is required'),
        body('category')
            .if(body('bannerType').equals('category'))
            .notEmpty()
            .withMessage('Category is required for category banners'),
        body('title')
            .optional()
            .isLength({ max: 100 })
            .withMessage('Title cannot exceed 100 characters'),
        body('status')
            .optional()
            .isBoolean()
            .withMessage('Status must be a boolean')
    ];
};

// Public routes
router.get('/', banner.getAllBanners);
router.get('/stats', banner.getBannerStats);
router.get('/type/:bannerType', banner.getBannersByType);
router.get('/category/:categoryId', banner.getBannersByCategory);
router.get('/:id', banner.getBannerById);

// Protected routes (Admin only)
// router.use(protect, authorize('admin'));

router.post('/',
    // bannerValidationRules(),
    uploadBannerImages.single('image'), // Use .single() for single image upload
    banner.createBanner
);

router.put('/:id',
    // bannerValidationRules(),
    uploadBannerImages.single('image'), // Use .single() for single image upload
    banner.updateBanner
);

router.patch('/:id/status', banner.updateBannerStatus);
router.patch('/bulk-status', banner.bulkUpdateStatus);

router.delete('/:id', banner.deleteBanner);
router.delete('/bulk', banner.bulkDeleteBanners);

module.exports = router;