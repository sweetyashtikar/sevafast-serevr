// routes/sellerRoutes.js
const express = require('express');
const router = express.Router();
const {
    handleSellerUploads,
    deleteOldFiles,
    cleanupOldFiles,
    trackUploadProgress
} = require('../middleware/sellerUploadMidlleware');
const {
    createSeller,
    getAllSellers,
    getSellerById,
    getSellerByUserId,
    getSellerBySlug,
    updateSeller,
    updateSellerStatus,
    updateSellerRating,
    deleteSeller,
    checkSellerServiceability,
    getSellerStatistics
} = require('../controllers/sellerController');

// File upload routes with middleware
router.post('/',
    trackUploadProgress,
    handleSellerUploads,
    createSeller
);

router.put('/:id',
    trackUploadProgress,
    deleteOldFiles,
    handleSellerUploads,
    cleanupOldFiles,
    updateSeller
);

// Other routes remain the same
router.get('/store/:slug', getSellerBySlug);
router.get('/:seller_id/serviceability', checkSellerServiceability);
router.get('/user/:user_id', getSellerByUserId);
router.get('/:id/stats', getSellerStatistics);
router.get('/', getAllSellers);
router.get('/:id', getSellerById);
router.patch('/:id/status', updateSellerStatus);
router.patch('/:id/rating', updateSellerRating);
router.delete('/:id', deleteSeller);

module.exports = router;