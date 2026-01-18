const Product = require("../models/products");
const {
  PRODUCT_TYPES,
  INDICATOR_TYPES,
  DELIVERABLE_TYPES,
  STOCK_STATUS,
  STOCK_LEVEL_TYPES,
} = require("../types/productTypes");
const Category = require("../models/category");
const Tax = require("../models/tax");
const AttributeValue = require("../models/attributeValue");
const {
  checkStatus
} = require("../utils/sanitizer");
const {
  mapBasicInfo,
  mapCategorization,
  mapTaxPricing,
  mapInventory,
  mapProductType,
  mapShipping,
  mapDimensions,
  mapPolicies,
  mapMedia,
  mapSEO,
  mapDigitalProduct,
  addProductTypeData,
  updateBasicInfo,
  updateCategorization,
  updateTaxPricing,
  updateInventory,
  updateShipping,
  updateDimensions,
  updatePolicies,
  updateMedia,
  updateDigitalProduct,
  updateProductTypeData,
  toBool,
  toFloat,
  toInt,
  toArray,
  isDefined
} = require("../utils/productHelper");

// ==========================================
// ADD PRODUCT
// ==========================================

const addProduct = async (req, res) => {
  try {
    const body = req.body;

    // Get vendor ID from authenticated user
    const vendorId = req.user._id;

    // const category = await Category.findById( categoryId);
    const [validateCategory, validateTax, validateAtrributeValue] = await Promise.all([
        checkStatus(Category, body.categoryId),
        checkStatus(Tax, body.taxId),
        checkStatus(AttributeValue, body.attributeValues),
      ]);
    if (!validateCategory || !validateTax || !validateAtrributeValue) {
      const missing = !validateCategory ? "Category" : !validateTax  ? "Tax" : "Attribute Value";

      return res.status(400).json({
        success: false,
        message: `${missing} is inactive or invalid.`,
      });
    }

    const productData = {
      vendorId,
      ...mapBasicInfo(body, validateCategory),
      ...mapCategorization(body, validateCategory, toArray),
      ...mapTaxPricing(body, toBool),
      ...mapInventory(body, toInt),
      ...mapProductType(body),
      ...mapShipping(body, toInt, toArray),
      ...mapDimensions(body, toFloat),
      ...mapPolicies(body),
      ...mapMedia(body),
      ...mapDigitalProduct(body, toBool),
      ...mapSEO(body),
      status: body.status === undefined ? true : toBool(body.status),
    };

    addProductTypeData(productData, body, toInt, toFloat, toArray);

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      data: { product },
    });
  } catch (error) {
    console.error("Add product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add product",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE PRODUCT
// ==========================================

const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const vendorId = req.user._id;
    const body = req.body;

    // Find product
    const product = await Product.findOne({
      _id: productId,
      vendorId,
      isDeleted: false,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.log("Update Product Request Body:", body);

    // Validate and update category if provided
    if (isDefined(body.categoryId)) {
      const categoryId = await checkStatus(Category, body.categoryId);
      if (!categoryId) {
        return res.status(400).json({
          success: false,
          message: "Category is inactive or invalid",
        });
      }
      product.categoryId = categoryId;
    }

    // Update basic information
    updateBasicInfo(product, body);

    // Update categorization
    updateCategorization(product, body, toArray, toInt);

    // Update tax & pricing
    updateTaxPricing(product, body, toBool);

    // Update inventory
    updateInventory(product, body, toInt);

    // Update shipping
    updateShipping(product, body, toInt, toArray);

    // Update dimensions
    updateDimensions(product, body, toFloat);

    // Update policies
    updatePolicies(product, body, toBool);

    // Update media
    updateMedia(product, body);

    // Update digital product settings
    updateDigitalProduct(product, body, toBool);

    // Update status
    if (isDefined(body.status)) {
      product.status = toBool(body.status);
    }

    // Update product type specific data
    updateProductTypeData(product, body, toInt, toFloat, toArray, isDefined);

    await product.save();

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: { product },
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE PRODUCT (Soft Delete)
// ==========================================

const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const vendorId = req.user._id;

    // Find product
    const product = await Product.findOne({
      _id: productId,
      vendorId,
      isDeleted: false,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const categoryId = await checkStatus(Category, body.categoryId);
    console.log("categoryId", categoryId);
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category is inactive or invalid",
      });
    }

    // Soft delete
    product.isDeleted = true;
    product.deletedAt = new Date();
    product.status = false;
    await product.save();

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
};

// ==========================================
// GET SINGLE PRODUCT
// ==========================================

const getProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,
    })
      .populate("vendorId", "username company")
      .populate("categoryId", "name sub_category")
      .populate("taxId", "title percentage")
      .populate("attributeValues" ,"value swatche_type swatche_value");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Increment views
    await product.incrementViews();

    res.status(200).json({
      success: true,
      data: { product },
    });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};

// ==========================================
// GET ALL PRODUCTS (with filters)
// ==========================================

const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      vendor,
      search,
      minPrice,
      maxPrice,
      brand,
      indicator,
      productType,
      sortBy = "createdAt",
      sortOrder = "desc",
      inStock,
      deliverableZipcodes
    } = req.query;

    console.log("req product", req.query)

    // Build query
    const query = {
      isDeleted: false,
      status: true,
      isApproved: true,
    };

    // Category filter
    if (category) {
      query.categoryId = category;
    }

    // Vendor filter
    if (vendor) {
      query.vendorId = vendor;
    }

    // Search filter (text search)
    if (search) {
      query.$text = { $search: search };
    }

    // Price range filter (for simple products)
    if (minPrice || maxPrice) {
      query["simpleProduct.price"] = {};
      if (minPrice) query["simpleProduct.price"].$gte = parseFloat(minPrice);
      if (maxPrice) query["simpleProduct.price"].$lte = parseFloat(maxPrice);
    }

    // Brand filter
    if (brand) {
      query.brand = brand;
    }

    // Indicator filter (veg/non-veg)
    if (indicator !== undefined) {
      query.indicator = parseInt(indicator);
    }

    // Product type filter
    if (productType) {
      query.productType = productType;
    }

    if (deliverableZipcodes) {
      query.$and = [
        { isDeleted: false }, // Maintain existing base query
        {
          $or: [
            { deliverableType: "all" },
            { deliverableZipcodes: deliverableZipcodes } 
          ]
        }
      ];
}

    // Stock filter
    if (inStock === "true") {
      query.$or = [
        { "simpleProduct.stockStatus": STOCK_STATUS.IN_STOCK },
        { "productLevelStock.stockStatus": STOCK_STATUS.IN_STOCK },
        { "variants.stockStatus": STOCK_STATUS.IN_STOCK },
      ];
    }

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    console.log(query)
    console.log("Final Query being sent to MongoDB:", JSON.stringify(query, null, 2));

    // Execute query
    const products = await Product.find(query)
      .populate("vendorId", "username company")
      .populate("categoryId", "name sub_category")
      .populate("taxId", "title percentage")
     .populate({
        path: "attributeValues",
        select: "value swatche_type swatche_value attribute_id", 
        populate: ({
          path: "attribute_id",
          select: "name type attribute_set_id", 
          populate:{
            path :'attribute_set_id',
            select : "name"
          }
        })
    })
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    console.log("products", products)

    // Get total count
    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalProducts: total,
          productsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get all products error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

// ==========================================
// GET VENDOR PRODUCTS
// ==========================================

const getVendorProducts = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { limit, offset, sort, searchQuery, filters } = req.paginationQuery;

    // Build query
    const query = {
      ...searchQuery,
      vendorId,
      isDeleted: false,
    };

    if (filters.status !== undefined) {
      query.status = filters.status === true;
    }

    if (filters.productType) {
      query.productType = filtersproductType;
    }

    // Execute query
    const products = await Product.find(query)
      .populate("categoryId", "name")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    // Calculate stats
    const [totalItems, active, inactive, pending] = await Promise.all([
      Product.countDocuments({ vendorId, isDeleted: false }),
      Product.countDocuments({ vendorId, status: true, isDeleted: false }),
      Product.countDocuments({ vendorId, status: false, isDeleted: false }),
      Product.countDocuments({ vendorId, isApproved: false, isDeleted: false }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        products,
        stats: { total: totalItems, active, inactive, pending },
        pagination: {
          totalRecords: total,
          limit,
          offset,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get vendor products error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor products",
      error: error.message,
    });
  }
};

// ==========================================
// GET PRODUCTS BY CATEGORY
// ==========================================

const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const products = await Product.find({
      categoryId,
      isDeleted: false,
      status: true,
      isApproved: true,
    })
      .populate("vendorId", "fullName businessName")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments({
      categoryId,
      isDeleted: false,
      status: true,
      isApproved: true,
    });

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalProducts: total,
        },
      },
    });
  } catch (error) {
    console.error("Get products by category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

// ==========================================
// SEARCH PRODUCTS
// ==========================================

const searchProducts = async (req, res) => {
  try {
    const { query, page = 1, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find({
      $text: { $search: query },
      isDeleted: false,
      status: true,
      isApproved: true,
    })
      .populate("vendorId", "fullName businessName")
      .populate("categoryId", "name")
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments({
      $text: { $search: query },
      isDeleted: false,
      status: true,
      isApproved: true,
    });

    res.status(200).json({
      success: true,
      data: {
        products,
        searchQuery: query,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalResults: total,
        },
      },
    });
  } catch (error) {
    console.error("Search products error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE PRODUCT STATUS
// ==========================================

const updateProductStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    const { status } = req.body;
    const vendorId = req.user._id;

    const product = await Product.findOne({
      _id: productId,
      vendorId,
      isDeleted: false,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.status = Boolean(parseInt(status));
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product ${
        product.status ? "activated" : "deactivated"
      } successfully`,
      data: { product },
    });
  } catch (error) {
    console.error("Update product status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product status",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE PRODUCT STOCK
// ==========================================

const updateProductStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { stock, variantIds } = req.body;
    const vendorId = req.user._id;

    const product = await Product.findOne({
      _id: productId,
      vendorId,
      isDeleted: false,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Update simple product stock
    if (product.productType === PRODUCT_TYPES.SIMPLE) {
      product.simpleProduct.totalStock = parseInt(stock);
      product.simpleProduct.stockStatus =
        parseInt(stock) > 0 ? STOCK_STATUS.IN_STOCK : STOCK_STATUS.OUT_OF_STOCK;
    }

    // Update variable product stock
    if (product.productType === PRODUCT_TYPES.VARIABLE) {
      if (product.variantStockLevelType === STOCK_LEVEL_TYPES.PRODUCT_LEVEL) {
        product.productLevelStock.totalStock = parseInt(stock);
        product.productLevelStock.stockStatus =
          parseInt(stock) > 0
            ? STOCK_STATUS.IN_STOCK
            : STOCK_STATUS.OUT_OF_STOCK;
      } else {
        const variant = product.variants.find(
          (v) => v.variantIds === variantIds
        );
        if (variant) {
          variant.totalStock = parseInt(stock);
          variant.stockStatus =
            parseInt(stock) > 0
              ? STOCK_STATUS.IN_STOCK
              : STOCK_STATUS.OUT_OF_STOCK;
        }
      }
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      data: { product },
    });
  } catch (error) {
    console.error("Update stock error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update stock",
      error: error.message,
    });
  }
};

// ==========================================
// CHECK DELIVERY AVAILABILITY
// ==========================================

const checkDelivery = async (req, res) => {
  try {
    const { productId } = req.params;
    const { zipcode } = req.query;

    if (!zipcode) {
      return res.status(400).json({
        success: false,
        message: "Zipcode is required",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,
      status: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const canDeliver = product.canDeliverTo(zipcode);

    res.status(200).json({
      success: true,
      data: {
        productId,
        zipcode,
        canDeliver,
        deliveryType: product.deliverableType,
        codAllowed: product.codAllowed,
      },
    });
  } catch (error) {
    console.error("Check delivery error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check delivery availability",
      error: error.message,
    });
  }
};

// ==========================================
// GET FEATURED PRODUCTS
// ==========================================

const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get products with high sales or ratings
    const products = await Product.find({
      isDeleted: false,
      status: true,
      isApproved: true,
    })
      .populate("vendorId", "fullName businessName")
      .populate("categoryId", "name")
      .sort({ totalSales: -1, "rating.average": -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: { products },
    });
  } catch (error) {
    console.error("Get featured products error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch featured products",
      error: error.message,
    });
  }
};

// ==========================================
// GET RELATED PRODUCTS
// ==========================================

const getRelatedProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 8 } = req.query;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find products in same category
    const relatedProducts = await Product.find({
      _id: { $ne: productId },
      categoryId: product.categoryId,
      isDeleted: false,
      status: true,
      isApproved: true,
    })
      .populate("vendorId", "fullName businessName")
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: { relatedProducts },
    });
  } catch (error) {
    console.error("Get related products error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch related products",
      error: error.message,
    });
  }
};

const approveProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const { isApproved, rejectionReason } = req.body;

    let updateData = {
      isApproved: isApproved,
      approvedBy: req.user._id,
      approvedAt: new Date(),
    };

    if (isApproved === true) {
      updateData.approvedAt = new Date();
      updateData.rejectionReason;
    } else {
      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: "Please provide a rejection reason.",
        });
      }
      updateData.rejectionReason = rejectionReason;
      updateData.approvedAt = null;
    }
    // 2. Update the product in the database
    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.status(200).json({
      success: true,
      message: isApproved
        ? "Product approved successfully"
        : "Product rejected",
      data: product,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  addProduct,
  updateProduct,
  deleteProduct,
  getProduct,
  getAllProducts,
  getVendorProducts,
  getProductsByCategory,
  searchProducts,
  updateProductStatus,
  updateProductStock,
  checkDelivery,
  getFeaturedProducts,
  getRelatedProducts,
  approveProduct,
};
