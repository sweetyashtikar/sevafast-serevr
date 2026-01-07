const Product = require('../models/products');
const { 
  PRODUCT_TYPES, 
  INDICATOR_TYPES, 
  DELIVERABLE_TYPES,
  STOCK_STATUS,
  STOCK_LEVEL_TYPES 
} = require('../types/productTypes');

// ==========================================
// ADD PRODUCT
// ==========================================

exports.addProduct = async (req, res) => {
  try {
    const {
      // Basic Info
      pro_input_name,
      short_description,
      pro_input_description,
      extra_input_description,
      
      // Categorization
      category_id,
      tags,
      brand,
      hsn_code,
      made_in,
      indicator,
      attribute_values,
      
      // Tax & Pricing
      pro_input_tax,
      is_prices_inclusive_tax,
      
      // Inventory
      total_allowed_quantity,
      minimum_order_quantity,
      quantity_step_size,
      
      // Product Type
      product_type,
      variant_stock_level_type,
      
      // Shipping
      deliverable_type,
      deliverable_zipcodes,
      pickup_location,
      
      // Policies
      cod_allowed,
      is_returnable,
      is_cancelable,
      cancelable_till,
      warranty_period,
      guarantee_period,
      
      // Media
      pro_input_image,
      other_images,
      video_type,
      video,
      pro_input_video,
      
      // Digital Product
      download_allowed,
      download_link_type,
      pro_input_zip,
      download_link,
      
      // Simple Product Data
      simple_price,
      simple_special_price,
      simple_product_stock_status,
      product_sku,
      product_total_stock,
      weight,
      height,
      breadth,
      length,
      
      // Variable Product Data
      variants_ids,
      variant_price,
      variant_special_price,
      variant_images,
      variant_sku,
      variant_total_stock,
      variant_level_stock_status,
      sku_variant_type,
      total_stock_variant_type,
      variant_status,
      
      status
    } = req.body;

    // Get vendor ID from authenticated user
    const vendorId = req.user._id;

    // Convert tags from comma-separated string to array
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : [];
    
    // Convert deliverable_zipcodes from comma-separated to array
    const zipcodesArray = deliverable_zipcodes ? 
      deliverable_zipcodes.split(',').map(zip => zip.trim()) : [];

    // Convert attribute_values from comma-separated to array
    const attributeValuesArray = attribute_values ? 
      attribute_values.split(',').map(val => val.trim()) : [];

    // Base product data
    const productData = {
      vendorId,
      name: pro_input_name,
      shortDescription: short_description,
      description: pro_input_description,
      extraDescription: extra_input_description,
      
      categoryId: category_id,
      tags: tagsArray,
      brand,
      hsnCode: hsn_code,
      madeIn: made_in || 'India',
      indicator: parseInt(indicator) || 0,
      attributeValues: attributeValuesArray,
      
      taxId: pro_input_tax,
      isPricesInclusiveTax: Boolean(parseInt(is_prices_inclusive_tax)),
      
      totalAllowedQuantity: parseInt(total_allowed_quantity) || 999999,
      minimumOrderQuantity: parseInt(minimum_order_quantity) || 1,
      quantityStepSize: parseInt(quantity_step_size) || 1,
      
      productType: product_type,
      variantStockLevelType: variant_stock_level_type,
      
      deliverableType: parseInt(deliverable_type) || DELIVERABLE_TYPES.ALL,
      deliverableZipcodes: zipcodesArray,
      pickupLocation: pickup_location,
      
      dimensions: {
        weight: parseFloat(weight) || 0,
        height: parseFloat(height) || 0,
        breadth: parseFloat(breadth) || 0,
        length: parseFloat(length) || 0
      },
      
      codAllowed: Boolean(parseInt(cod_allowed)),
      isReturnable: Boolean(parseInt(is_returnable)),
      isCancelable: Boolean(parseInt(is_cancelable)),
      cancelableTill: cancelable_till,
      warrantyPeriod: warranty_period,
      guaranteePeriod: guarantee_period,
      
      mainImage: pro_input_image,
      otherImages: other_images || [],
      
      video: {
        type: video_type,
        url: video,
        file: pro_input_video
      },
      
      downloadAllowed: Boolean(parseInt(download_allowed)),
      downloadLinkType: download_link_type,
      downloadFile: pro_input_zip,
      downloadLink: download_link,
      
      isActive: status === undefined ? true : Boolean(parseInt(status))
    };

    // Handle Simple Product
    if (product_type === PRODUCT_TYPES.SIMPLE) {
      productData.simpleProduct = {
        price: parseFloat(simple_price),
        specialPrice: simple_special_price ? parseFloat(simple_special_price) : undefined,
        sku: product_sku,
        totalStock: parseInt(product_total_stock) || 0,
        stockStatus: simple_product_stock_status !== undefined ? 
          parseInt(simple_product_stock_status) : null
      };
    }

    // Handle Digital Product
    if (product_type === PRODUCT_TYPES.DIGITAL) {
      productData.simpleProduct = {
        price: parseFloat(simple_price),
        specialPrice: simple_special_price ? parseFloat(simple_special_price) : undefined
      };
    }

    // Handle Variable Product
    if (product_type === PRODUCT_TYPES.VARIABLE) {
      // Parse variant data
      const variantIdsArray = variants_ids.split(',').map(v => v.trim());
      const variantPriceArray = variant_price.split(',').map(p => parseFloat(p));
      const variantSpecialPriceArray = variant_special_price ? 
        variant_special_price.split(',').map(p => parseFloat(p)) : [];
      
      // Build variants array
      productData.variants = variantIdsArray.map((ids, index) => {
        const variant = {
          variantIds: ids,
          price: variantPriceArray[index],
          specialPrice: variantSpecialPriceArray[index] || undefined,
          images: variant_images ? variant_images[index] : []
        };

        // Add dimensions if provided (arrays)
        if (weight) {
          const weights = weight.split(',');
          variant.weight = parseFloat(weights[index]) || 0;
        }
        if (height) {
          const heights = height.split(',');
          variant.height = parseFloat(heights[index]) || 0;
        }
        if (breadth) {
          const breadths = breadth.split(',');
          variant.breadth = parseFloat(breadths[index]) || 0;
        }
        if (length) {
          const lengths = length.split(',');
          variant.length = parseFloat(lengths[index]) || 0;
        }

        // Variable level stock management
        if (variant_stock_level_type === STOCK_LEVEL_TYPES.VARIABLE_LEVEL) {
          const skuArray = variant_sku ? variant_sku.split(',') : [];
          const stockArray = variant_total_stock ? variant_total_stock.split(',') : [];
          const statusArray = variant_level_stock_status ? 
            variant_level_stock_status.split(',') : [];

          variant.sku = skuArray[index] || '';
          variant.totalStock = parseInt(stockArray[index]) || 0;
          variant.stockStatus = parseInt(statusArray[index]) || STOCK_STATUS.IN_STOCK;
        }

        return variant;
      });

      // Product level stock management
      if (variant_stock_level_type === STOCK_LEVEL_TYPES.PRODUCT_LEVEL) {
        productData.productLevelStock = {
          sku: sku_variant_type,
          totalStock: parseInt(total_stock_variant_type) || 0,
          stockStatus: parseInt(variant_status) || STOCK_STATUS.IN_STOCK
        };
      }
    }

    // Create product
    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      data: { product }
    });

  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add product',
      error: error.message
    });
  }
};

// ==========================================
// UPDATE PRODUCT
// ==========================================

exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const vendorId = req.user._id;

    // Find product
    const product = await Product.findOne({
      _id: productId,
      vendorId,
      isDeleted: false
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Update fields (same logic as add, but updating existing product)
    const {
      pro_input_name,
      short_description,
      pro_input_description,
      category_id,
      tags,
      brand,
      indicator,
      simple_price,
      simple_special_price,
      product_total_stock,
      status
    } = req.body;

    // Update basic fields
    if (pro_input_name) product.name = pro_input_name;
    if (short_description) product.shortDescription = short_description;
    if (pro_input_description) product.description = pro_input_description;
    if (category_id) product.categoryId = category_id;
    if (brand) product.brand = brand;
    if (indicator !== undefined) product.indicator = parseInt(indicator);
    if (status !== undefined) product.isActive = Boolean(parseInt(status));

    // Update tags
    if (tags) {
      product.tags = tags.split(',').map(tag => tag.trim());
    }

    // Update simple product data
    if (product.productType === PRODUCT_TYPES.SIMPLE) {
      if (simple_price) {
        product.simpleProduct.price = parseFloat(simple_price);
      }
      if (simple_special_price !== undefined) {
        product.simpleProduct.specialPrice = simple_special_price ? 
          parseFloat(simple_special_price) : undefined;
      }
      if (product_total_stock !== undefined) {
        product.simpleProduct.totalStock = parseInt(product_total_stock);
      }
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
};

// ==========================================
// DELETE PRODUCT (Soft Delete)
// ==========================================

exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const vendorId = req.user._id;

    // Find product
    const product = await Product.findOne({
      _id: productId,
      vendorId,
      isDeleted: false
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Soft delete
    product.isDeleted = true;
    product.deletedAt = new Date();
    product.isActive = false;
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
};

// ==========================================
// GET SINGLE PRODUCT
// ==========================================

exports.getProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findOne({
      _id: productId,
      isDeleted: false
    })
    .populate('vendorId', 'fullName email businessName')
    .populate('categoryId', 'name')
    .populate('taxId', 'name rate');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment views
    await product.incrementViews();

    res.status(200).json({
      success: true,
      data: { product }
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
};

// ==========================================
// GET ALL PRODUCTS (with filters)
// ==========================================

exports.getAllProducts = async (req, res) => {
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
      sortBy = 'createdAt',
      sortOrder = 'desc',
      inStock
    } = req.query;

    // Build query
    const query = {
      isDeleted: false,
      isActive: true,
      isApproved: true
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
      query['simpleProduct.price'] = {};
      if (minPrice) query['simpleProduct.price'].$gte = parseFloat(minPrice);
      if (maxPrice) query['simpleProduct.price'].$lte = parseFloat(maxPrice);
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

    // Stock filter
    if (inStock === 'true') {
      query.$or = [
        { 'simpleProduct.stockStatus': STOCK_STATUS.IN_STOCK },
        { 'productLevelStock.stockStatus': STOCK_STATUS.IN_STOCK },
        { 'variants.stockStatus': STOCK_STATUS.IN_STOCK }
      ];
    }

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const products = await Product.find(query)
      .populate('vendorId', 'fullName businessName')
      .populate('categoryId', 'name')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

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
          productsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

// ==========================================
// GET VENDOR PRODUCTS
// ==========================================

exports.getVendorProducts = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const {
      page = 1,
      limit = 20,
      status,
      productType,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {
      vendorId,
      isDeleted: false
    };

    if (status !== undefined) {
      query.isActive = status === 'active';
    }

    if (productType) {
      query.productType = productType;
    }

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const products = await Product.find(query)
      .populate('categoryId', 'name')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    // Calculate stats
    const stats = {
      total: await Product.countDocuments({ vendorId, isDeleted: false }),
      active: await Product.countDocuments({ vendorId, isActive: true, isDeleted: false }),
      inactive: await Product.countDocuments({ vendorId, isActive: false, isDeleted: false }),
      pending: await Product.countDocuments({ vendorId, isApproved: false, isDeleted: false })
    };

    res.status(200).json({
      success: true,
      data: {
        products,
        stats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalProducts: total,
          productsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get vendor products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor products',
      error: error.message
    });
  }
};

// ==========================================
// GET PRODUCTS BY CATEGORY
// ==========================================

exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const products = await Product.find({
      categoryId,
      isDeleted: false,
      isActive: true,
      isApproved: true
    })
    .populate('vendorId', 'fullName businessName')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Product.countDocuments({
      categoryId,
      isDeleted: false,
      isActive: true,
      isApproved: true
    });

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalProducts: total
        }
      }
    });

  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

// ==========================================
// SEARCH PRODUCTS
// ==========================================

exports.searchProducts = async (req, res) => {
  try {
    const { query, page = 1, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find({
      $text: { $search: query },
      isDeleted: false,
      isActive: true,
      isApproved: true
    })
    .populate('vendorId', 'fullName businessName')
    .populate('categoryId', 'name')
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Product.countDocuments({
      $text: { $search: query },
      isDeleted: false,
      isActive: true,
      isApproved: true
    });

    res.status(200).json({
      success: true,
      data: {
        products,
        searchQuery: query,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalResults: total
        }
      }
    });

  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
};

// ==========================================
// UPDATE PRODUCT STATUS
// ==========================================

exports.updateProductStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    const { status } = req.body;
    const vendorId = req.user._id;

    const product = await Product.findOne({
      _id: productId,
      vendorId,
      isDeleted: false
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.isActive = Boolean(parseInt(status));
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { product }
    });

  } catch (error) {
    console.error('Update product status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product status',
      error: error.message
    });
  }
};

// ==========================================
// UPDATE PRODUCT STOCK
// ==========================================

exports.updateProductStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { stock, variantIds } = req.body;
    const vendorId = req.user._id;

    const product = await Product.findOne({
      _id: productId,
      vendorId,
      isDeleted: false
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Update simple product stock
    if (product.productType === PRODUCT_TYPES.SIMPLE) {
      product.simpleProduct.totalStock = parseInt(stock);
      product.simpleProduct.stockStatus = parseInt(stock) > 0 ? 
        STOCK_STATUS.IN_STOCK : STOCK_STATUS.OUT_OF_STOCK;
    }

    // Update variable product stock
    if (product.productType === PRODUCT_TYPES.VARIABLE) {
      if (product.variantStockLevelType === STOCK_LEVEL_TYPES.PRODUCT_LEVEL) {
        product.productLevelStock.totalStock = parseInt(stock);
        product.productLevelStock.stockStatus = parseInt(stock) > 0 ? 
          STOCK_STATUS.IN_STOCK : STOCK_STATUS.OUT_OF_STOCK;
      } else {
        const variant = product.variants.find(v => v.variantIds === variantIds);
        if (variant) {
          variant.totalStock = parseInt(stock);
          variant.stockStatus = parseInt(stock) > 0 ? 
            STOCK_STATUS.IN_STOCK : STOCK_STATUS.OUT_OF_STOCK;
        }
      }
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      data: { product }
    });

  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock',
      error: error.message
    });
  }
};

// ==========================================
// CHECK DELIVERY AVAILABILITY
// ==========================================

exports.checkDelivery = async (req, res) => {
  try {
    const { productId } = req.params;
    const { zipcode } = req.query;

    if (!zipcode) {
      return res.status(400).json({
        success: false,
        message: 'Zipcode is required'
      });
    }

    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
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
        codAllowed: product.codAllowed
      }
    });

  } catch (error) {
    console.error('Check delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check delivery availability',
      error: error.message
    });
  }
};

// ==========================================
// GET FEATURED PRODUCTS
// ==========================================

exports.getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get products with high sales or ratings
    const products = await Product.find({
      isDeleted: false,
      isActive: true,
      isApproved: true
    })
    .populate('vendorId', 'fullName businessName')
    .populate('categoryId', 'name')
    .sort({ totalSales: -1, 'rating.average': -1 })
    .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: { products }
    });

  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured products',
      error: error.message
    });
  }
};

// ==========================================
// GET RELATED PRODUCTS
// ==========================================

exports.getRelatedProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 8 } = req.query;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Find products in same category
    const relatedProducts = await Product.find({
      _id: { $ne: productId },
      categoryId: product.categoryId,
      isDeleted: false,
      isActive: true,
      isApproved: true
    })
    .populate('vendorId', 'fullName businessName')
    .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: { relatedProducts }
    });

  } catch (error) {
    console.error('Get related products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch related products',
      error: error.message
    });
  }
};