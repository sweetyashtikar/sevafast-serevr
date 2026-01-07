const { body, query, param, validationResult } = require('express-validator');
const { PRODUCT_TYPES, INDICATOR_TYPES, DELIVERABLE_TYPES } = require('../models/Product');

// Handle validation errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

// ==========================================
// ADD PRODUCT VALIDATION
// ==========================================

exports.validateAddProduct = [
  // Basic Info
  body('pro_input_name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Product name must be between 3 and 200 characters'),
  
  body('short_description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Short description cannot exceed 500 characters'),
  
  body('category_id')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  body('indicator')
    .optional()
    .isIn(['0', '1', '2'])
    .withMessage('Indicator must be 0 (None), 1 (Veg), or 2 (Non-Veg)'),
  
  // Product Type
  body('product_type')
    .notEmpty()
    .withMessage('Product type is required')
    .isIn(Object.values(PRODUCT_TYPES))
    .withMessage('Invalid product type'),
  
  // Inventory
  body('total_allowed_quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Total allowed quantity must be at least 1'),
  
  body('minimum_order_quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum order quantity must be at least 1'),
  
  body('quantity_step_size')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity step size must be at least 1'),
  
  // Delivery
  body('deliverable_type')
    .optional()
    .isIn(['0', '1', '2', '3'])
    .withMessage('Invalid deliverable type'),
  
  body('deliverable_zipcodes')
    .if(body('deliverable_type').isIn(['2', '3']))
    .notEmpty()
    .withMessage('Deliverable zipcodes are required for Include/Exclude delivery type'),
  
  // Policies
  body('cod_allowed')
    .optional()
    .isIn(['0', '1'])
    .withMessage('COD allowed must be 0 or 1'),
  
  body('is_returnable')
    .optional()
    .isIn(['0', '1'])
    .withMessage('Is returnable must be 0 or 1'),
  
  body('is_cancelable')
    .optional()
    .isIn(['0', '1'])
    .withMessage('Is cancelable must be 0 or 1'),
  
  body('cancelable_till')
    .if(body('is_cancelable').equals('1'))
    .isIn(['received', 'processed', 'shipped'])
    .withMessage('Invalid cancelable stage'),
  
  // Media
  body('pro_input_image')
    .notEmpty()
    .withMessage('Main product image is required'),
  
  // Simple Product Validation
  body('simple_price')
    .if(body('product_type').isIn(['simple_product', 'digital_product']))
    .notEmpty()
    .withMessage('Price is required for simple/digital products')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  body('simple_special_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Special price must be a positive number')
    .custom((value, { req }) => {
      if (value && req.body.simple_price && parseFloat(value) >= parseFloat(req.body.simple_price)) {
        throw new Error('Special price must be less than regular price');
      }
      return true;
    }),
  
  // Variable Product Validation
  body('variant_stock_level_type')
    .if(body('product_type').equals('variable_product'))
    .notEmpty()
    .withMessage('Variant stock level type is required for variable products')
    .isIn(['product_level', 'variable_level'])
    .withMessage('Invalid variant stock level type'),
  
  body('variants_ids')
    .if(body('product_type').equals('variable_product'))
    .notEmpty()
    .withMessage('Variant IDs are required for variable products'),
  
  body('variant_price')
    .if(body('product_type').equals('variable_product'))
    .notEmpty()
    .withMessage('Variant prices are required for variable products'),
  
  // Digital Product Validation
  body('download_link_type')
    .if(body('product_type').equals('digital_product'))
    .notEmpty()
    .withMessage('Download link type is required for digital products')
    .isIn(['self_hosted', 'add_link'])
    .withMessage('Invalid download link type'),
  
  body('pro_input_zip')
    .if(body('download_link_type').equals('self_hosted'))
    .notEmpty()
    .withMessage('Download file is required for self-hosted digital products'),
  
  body('download_link')
    .if(body('download_link_type').equals('add_link'))
    .notEmpty()
    .withMessage('Download link is required for linked digital products')
    .isURL()
    .withMessage('Invalid download link URL'),
  
  exports.handleValidationErrors
];

// ==========================================
// UPDATE PRODUCT VALIDATION
// ==========================================

exports.validateUpdateProduct = [
  param('productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  
  body('pro_input_name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Product name must be between 3 and 200 characters'),
  
  body('category_id')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  body('simple_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  body('simple_special_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Special price must be a positive number'),
  
  body('status')
    .optional()
    .isIn(['0', '1'])
    .withMessage('Status must be 0 or 1'),
  
  exports.handleValidationErrors
];

// ==========================================
// DELETE PRODUCT VALIDATION
// ==========================================

exports.validateDeleteProduct = [
  param('productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  
  exports.handleValidationErrors
];

// ==========================================
// GET PRODUCT VALIDATION
// ==========================================

exports.validateGetProduct = [
  param('productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  
  exports.handleValidationErrors
];

// ==========================================
// GET ALL PRODUCTS VALIDATION
// ==========================================

exports.validateGetAllProducts = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number')
    .custom((value, { req }) => {
      if (req.query.minPrice && parseFloat(value) < parseFloat(req.query.minPrice)) {
        throw new Error('Maximum price must be greater than minimum price');
      }
      return true;
    }),
  
  query('indicator')
    .optional()
    .isIn(['0', '1', '2'])
    .withMessage('Invalid indicator value'),
  
  query('productType')
    .optional()
    .isIn(Object.values(PRODUCT_TYPES))
    .withMessage('Invalid product type'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'name', 'price', 'totalSales', 'rating.average', 'views'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  query('inStock')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('inStock must be true or false'),
  
  exports.handleValidationErrors
];

// ==========================================
// SEARCH PRODUCTS VALIDATION
// ==========================================

exports.validateSearchProducts = [
  query('query')
    .notEmpty()
    .withMessage('Search query is required')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  exports.handleValidationErrors
];

// ==========================================
// UPDATE STOCK VALIDATION
// ==========================================

exports.validateUpdateStock = [
  param('productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  
  body('stock')
    .notEmpty()
    .withMessage('Stock quantity is required')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  
  body('variantIds')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Variant IDs cannot be empty'),
  
  exports.handleValidationErrors
];

// ==========================================
// UPDATE STATUS VALIDATION
// ==========================================

exports.validateUpdateStatus = [
  param('productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['0', '1'])
    .withMessage('Status must be 0 (inactive) or 1 (active)'),
  
  exports.handleValidationErrors
];

// ==========================================
// CHECK DELIVERY VALIDATION
// ==========================================

exports.validateCheckDelivery = [
  param('productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  
  query('zipcode')
    .notEmpty()
    .withMessage('Zipcode is required')
    .matches(/^[0-9]{6}$/)
    .withMessage('Zipcode must be 6 digits'),
  
  exports.handleValidationErrors
];

// ==========================================
// GET BY CATEGORY VALIDATION
// ==========================================

exports.validateGetByCategory = [
  param('categoryId')
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  exports.handleValidationErrors
];