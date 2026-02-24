const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const {
  authenticate,
  authorizePermission,
  optionalAuth,
  checkIfAdmin
} = require("../middleware/authMiddleware");
const { pagination } = require("../middleware/pagination");
const { uploadProductImages, uploadProductVideos } = require("../middleware/uploadconfig");


// ==========================================
// PUBLIC ROUTES (No authentication required)
// ==========================================

/**
 * @route   GET /api/products/getAllProducts
 * @desc    Get all products (admin view)
 * @access  Private (Admin only)
 */
router.get(
  "/getAllProducts",
  authenticate,
  checkIfAdmin,
  productController.getAllProducts
);

/**
 * @route   GET /api/products
 * @desc    Get all products (with filters, pagination, search)
 * @access  Public
 * @query   page, limit, category, search, minPrice, maxPrice, brand, indicator, productType, sortBy, sortOrder, inStock
 */
router.get("/", productController.getAllProductsWithFilters);

/**
 * @route   GET /api/products/:productId
 * @desc    Get single product details
 * @access  Public
 */
router.get("/:productId", productController.getProductById);

/**
 * @route   GET /api/products/category/:categoryId
 * @desc    Get products by category
 * @access  Public
 * @query   page, limit, sortBy, sortOrder
 */
router.get("/category/:categoryId", productController.getProductsByCategory);

/**
 * @route   GET /api/products/search
 * @desc    Search products
 * @access  Public
 * @query   query, page, limit
 */
router.get("/search/all", productController.searchProducts);

/**
 * @route   GET /api/products/featured/all
 * @desc    Get featured products
 * @access  Public
 * @query   limit
 */
router.get("/featured/all", productController.getFeaturedProducts);

/**
 * @route   GET /api/products/related/:productId
 * @desc    Get related products
 * @access  Public
 * @query   limit
 */
router.get("/related/:productId", productController.getRelatedProducts);

/**
 * @route   GET /api/products/check-delivery/:productId
 * @desc    Check if product can be delivered to a zipcode
 * @access  Public
 * @query   zipcode
 */
router.get("/check-delivery/:productId", productController.checkDelivery);

// ==========================================
// VENDOR ROUTES (Authentication required)
// ==========================================

/**
 * @route   POST /api/products
 * @desc    Add new product
 * @access  Private (Vendor only)
 */
router.post(
  "/",
  authenticate,
  authorizePermission("can_manage_products"),
  uploadProductImages.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'otherImages', maxCount: 10 },
    { name: 'variant_images', maxCount: 50 },
  ]),
  productController.addProduct
);




/**
 * @route   PUT /api/products/:productId
 * @desc    Update product
 * @access  Private (Vendor only - own products)
 */
router.patch(
  "/:id",
  authenticate,
  authorizePermission("can_manage_products"),
  uploadProductImages.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'otherImages', maxCount: 10 }
  ]),
  productController.updateProduct
);

/**
 * @route   DELETE /api/products/:productId
 * @desc    Delete product (soft delete)
 * @access  Private (Vendor only - own products)
 */
router.delete(
  "/:productId",
  authenticate,
  authorizePermission("can_manage_products"),
  productController.deleteProduct
);

/**
 * @route   GET /api/products/vendor/my-products
 * @desc    Get vendor's own products
 * @access  Private (Vendor only)
 * @query   page, limit, status, productType, sortBy, sortOrder
 */
router.get(
  "/vendor/my-products",
  authenticate,
  pagination,
  authorizePermission("can_manage_products"),
  productController.getVendorProducts
);

/**
 * @route   PATCH /api/products/:productId/status
 * @desc    Update product status (active/inactive)
 * @access  Private (Vendor only - own products)
 */
router.patch(
  "/:productId/status",
  authenticate,
  authorizePermission("can_manage_products"),
  productController.updateProductStatus
);

/**
 * @route   PATCH /api/products/:productId/stock
 * @desc    Update product stock
 * @access  Private (Vendor only - own products)
 * @body    { stock: number, variantIds?: string }
 */
router.patch(
  "/:productId/stock",
  authenticate,
  authorizePermission("can_manage_products"),
  productController.updateProductStock
);

router.patch(
  "/:id",
  authenticate,
  checkIfAdmin,
  productController.approveProduct
);

// router.get(
//   "/getAllProducts",
//   authenticate,
//   authorizePermission("can_manage_products"),
//   productController.getAllProducts
// );

module.exports = router;
