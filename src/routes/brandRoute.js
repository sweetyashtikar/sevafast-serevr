const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');
const {authenticate, authorizePermission} = require('../middleware/authMiddleware');

// Validation middleware (optional - you can use express-validator or Joi)
const validateBrand = (req, res, next) => {
  const { name } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Brand name is required'
    });
  }
  
//   if (!icon || icon.trim() === '') {
//     return res.status(400).json({
//       success: false,
//       message: 'Brand icon is required'
//     });
//   }
  
  next();
};

// @route   POST /api/brands
// @desc    Create a new brand
router.post('/', validateBrand, brandController.createBrand);

// @route   GET /api/brands
// @desc    Get all brands with filtering, sorting, and pagination
router.get('/', brandController.getAllBrands);

// @route   GET /api/brands/:id
// @desc    Get single brand by ID
router.get('/:id', brandController.getBrandById);

// @route   PUT /api/brands/:id
// @desc    Update brand
router.patch('/:id', validateBrand, brandController.updateBrand);

// @route   DELETE /api/brands/:id
// @desc    Delete brand
router.delete('/:id', brandController.deleteBrand);

// @route   GET /api/brands/status/:status
// @desc    Get brands by status
router.get('/status/:status', brandController.getBrandsByStatus);

module.exports = router;