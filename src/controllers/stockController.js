// controllers/stockSalesViewController.js
const Product = require('../models/products');
const Order = require('../models/orders');
const Category = require('../models/category');
const mongoose = require('mongoose');
const { STOCK_STATUS, PRODUCT_TYPES, VARIANT_STOCK_LEVEL_TYPES } = require('../types/productTypes');

// At the top of your file, add this helper function
const toObjectId = (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
};


/**
 * Get stock and sales view for all products (table format like in the image)
 * GET /api/stock-sales/view
 */
exports.getStockSalesView = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      category = '',
      seller = '',
      search = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = -1
    } = req.query;
    console.log("req.query", req.query)

    // Build filter query
    const filter = { isDeleted: false };
    
     // Filter by category - FIXED
    if (category && category !== 'All Category' && category !== '') {
      const categoryId = toObjectId(category);
      if (categoryId) {
        filter.categoryId = categoryId;
      }
    }
    
    // Filter by seller/vendor - FIXED
    if (seller && seller !== '') {
      const sellerId = toObjectId(seller);
      if (sellerId) {
        filter.vendorId = sellerId;
      }
    }
    
   if (status !== undefined && status !== '') {
  filter.status = status === 'true' || status === 'Active';
}
    
    // Search by product name or SKU
    if (search && search !== '') {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'simpleProduct.sp_sku': { $regex: search, $options: 'i' } },
        { 'variants.variant_sku': { $regex: search, $options: 'i' } }
      ];
    }

    // Get all products with pagination
    const products = await Product.find(filter)
      .populate('vendorId', 'username email storeName name')
      .populate('categoryId', 'name')
      .sort({ [sortBy]: parseInt(sortOrder) })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count for pagination
    const totalProducts = await Product.countDocuments(filter);

    // Get sales data for all products
    const productIds = products.map(p => p._id);
    
    // Get order statistics for these products
    const orderStats = await Order.aggregate([
      { $unwind: '$items' },
      { 
        $match: { 
          'items.productId': { $in: productIds },
          orderStatus: 'delivered' // Only count delivered orders for sales
        } 
      },
      {
        $group: {
          _id: '$items.productId',
          totalSales: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          totalOrders: { $sum: 1 },
          lastSaleDate: { $max: '$createdAt' }
        }
      }
    ]);

    // Create a map for quick lookup
    const salesMap = {};
    orderStats.forEach(stat => {
      salesMap[stat._id.toString()] = stat;
    });

    // Transform products into table rows (flatten variants)
    const tableRows = [];
    
    products.forEach(product => {
      // Get seller info
      const sellerName = product.vendorId?.storeName || product.vendorId?.username || 'Unknown Seller';
      
      // Handle different product types
      if (product.productType === PRODUCT_TYPES.SIMPLE || 
          product.productType === PRODUCT_TYPES.DIGITAL) {
        // Single row for simple product
        tableRows.push({
          id: product._id,
          name: product.name,
          shortName: truncateText(product.name, 30),
          seller: sellerName,
          sellerId: product.vendorId?._id,
          image: product.mainImage || product.otherImages?.[0] || '/default-product.jpg',
          variation: 'Default',
          variationId: null,
          sku: product.simpleProduct?.sp_sku || 'N/A',
          stock: product.simpleProduct?.sp_totalStock || 0,
          stockStatus: product.simpleProduct?.sp_stockStatus || STOCK_STATUS.OUT_OF_STOCK,
          price: product.simpleProduct?.sp_price || 0,
          specialPrice: product.simpleProduct?.sp_specialPrice,
          status: product.status ? 'Active' : 'Inactive',
          isApproved: product.isApproved,
          category: product.categoryId?.name || 'Uncategorized',
          sales: salesMap[product._id.toString()]?.totalSales || 0,
          revenue: salesMap[product._id.toString()]?.totalRevenue || 0,
          orders: salesMap[product._id.toString()]?.totalOrders || 0,
          lastSaleDate: salesMap[product._id.toString()]?.lastSaleDate,
          productType: PRODUCT_TYPES.SIMPLE,
          stockDisplay: formatStockDisplay(product.simpleProduct?.sp_totalStock)
        });
      } 
      else if (product.productType === PRODUCT_TYPES.VARIABLE) {
        if (product.variantStockLevelType === VARIANT_STOCK_LEVEL_TYPES.VARIABLE_LEVEL) {
          // One row per variant
          product.variants.forEach(variant => {
            if (variant.variant_isActive) {
              tableRows.push({
                id: product._id,
                variantId: variant._id,
                name: product.name,
                shortName: truncateText(product.name, 25),
                variantName: variant.variant_name,
                fullName: `${product.name} - ${variant.variant_name}`,
                seller: sellerName,
                sellerId: product.vendorId?._id,
                image: variant.variant_images?.[0] || product.mainImage || '/default-product.jpg',
                variation: variant.variant_name,
                variationId: variant._id,
                sku: variant.variant_sku || 'N/A',
                stock: variant.variant_totalStock || 0,
                stockStatus: variant.variant_stockStatus,
                price: variant.variant_price || 0,
                specialPrice: variant.variant_specialPrice,
                status: product.status ? 'Active' : 'Inactive',
                isApproved: product.isApproved,
                category: product.categoryId?.name || 'Uncategorized',
                sales: salesMap[product._id.toString()]?.totalSales || 0, // Note: This is product-level sales
                revenue: salesMap[product._id.toString()]?.totalRevenue || 0,
                orders: salesMap[product._id.toString()]?.totalOrders || 0,
                productType: PRODUCT_TYPES.VARIABLE,
                stockDisplay: formatStockDisplay(variant.variant_totalStock)
              });
            }
          });
        } else {
          // Product level stock for variable product
          tableRows.push({
            id: product._id,
            name: product.name,
            shortName: truncateText(product.name, 30),
            seller: sellerName,
            sellerId: product.vendorId?._id,
            image: product.mainImage || product.otherImages?.[0] || '/default-product.jpg',
            variation: 'All Variants',
            variationId: null,
            sku: product.productLevelStock?.pls_sku || 'N/A',
            stock: product.productLevelStock?.pls_totalStock || 0,
            stockStatus: product.productLevelStock?.pls_stockStatus,
            price: 'Varies',
            status: product.status ? 'Active' : 'Inactive',
            isApproved: product.isApproved,
            category: product.categoryId?.name || 'Uncategorized',
            sales: salesMap[product._id.toString()]?.totalSales || 0,
            revenue: salesMap[product._id.toString()]?.totalRevenue || 0,
            orders: salesMap[product._id.toString()]?.totalOrders || 0,
            variantCount: product.variants.length,
            productType: VARIANT_STOCK_LEVEL_TYPES.VARIABLE_LEVEL,
            stockDisplay: formatStockDisplay(product.productLevelStock?.pls_totalStock)
          });
        }
      }
    });

    // Get all categories for filter dropdown
    const categories = await Category.find({ status: true }).select('name');

    // Get all sellers with products for filter dropdown
    const sellers = await Product.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$vendorId' } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'vendor' } },
      { $unwind: '$vendor' },
      { $project: { _id: 1, name: '$vendor.storeName', email: '$vendor.email' ,name: '$vendor.username'} }
    ]);

    // Calculate summary statistics
    const summary = {
      totalProducts: totalProducts,
      totalRows: tableRows.length,
      totalStock: tableRows.reduce((sum, row) => sum + (row.stock || 0), 0),
      totalSales: tableRows.reduce((sum, row) => sum + (row.sales || 0), 0),
      totalRevenue: tableRows.reduce((sum, row) => sum + (row.revenue || 0), 0),
      outOfStock: tableRows.filter(row => row.stock === 0).length,
      lowStock: tableRows.filter(row => row.stock > 0 && row.stock <= 10).length,
      publishedCount: tableRows.filter(row => row.status === 'Active').length,
      unpublishedCount: tableRows.filter(row => row.status === 'Inactive').length
    };

    res.status(200).json({
      success: true,
      data: {
        tableRows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalProducts / parseInt(limit)),
          totalItems: totalProducts,
          itemsPerPage: parseInt(limit),
          showingFrom: (parseInt(page) - 1) * parseInt(limit) + 1,
          showingTo: Math.min(parseInt(page) * parseInt(limit), totalProducts)
        },
        filters: {
          categories,
          sellers,
          selectedCategory: category,
          selectedSeller: seller,
          searchTerm: search,
          selectedStatus: status
        },
        summary,
        exportUrl: `/api/stock-sales/export?${new URLSearchParams(req.query).toString()}`
      }
    });

  } catch (error) {
    console.error('Error fetching stock sales view:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock and sales data',
      error: error.message
    });
  }
};

/**
 * Get detailed view for a single product
 * GET /api/stock-sales/product/:productId
 */
exports.getProductDetailView = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await Product.findById(productId)
      .populate('vendorId', 'name email storeName phone')
      .populate('categoryId', 'name')
      .populate('taxId', 'name rate');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get sales data for this product
    const salesData = await Order.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.productId': productId } },
      {
        $group: {
          _id: {
            variantId: '$items.variantId',
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          totalSales: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    // Get recent orders for this product
    const recentOrders = await Order.find({ 'items.productId': productId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'name email')
      .select('orderNumber createdAt items orderStatus total');

    // Transform product data for detailed view
    const detailView = {
      productInfo: {
        id: product._id,
        name: product.name,
        slug: product.slug,
        type: product.productType,
        category: product.categoryId,
        brand: product.brand,
        hsnCode: product.hsnCode,
        status: product.status ? 'Active' : 'Inactive',
        isApproved: product.isApproved,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      },
      sellerInfo: product.vendorId,
      media: {
        mainImage: product.mainImage,
        otherImages: product.otherImages,
        video: product.video
      },
      stockInfo: {},
      salesInfo: {
        totalSales: 0,
        totalRevenue: 0,
        totalOrders: 0,
        monthlyBreakdown: salesData
      },
      variants: []
    };

    // Handle different product types
    if (product.productType === PRODUCT_TYPES.SIMPLE || 
        product.productType === PRODUCT_TYPES.DIGITAL) {
      detailView.stockInfo = {
        type: 'simple',
        sku: product.simpleProduct?.sp_sku,
        stock: product.simpleProduct?.sp_totalStock,
        stockStatus: product.simpleProduct?.sp_stockStatus,
        price: product.simpleProduct?.sp_price,
        specialPrice: product.simpleProduct?.sp_specialPrice,
        isInclusiveTax: product.isPricesInclusiveTax
      };
      
      // Get variant-specific sales if needed
      const variantSales = await Order.aggregate([
        { $unwind: '$items' },
        { 
          $match: { 
            'items.productId': mongoose.Types.ObjectId(productId),
            'items.variantId': null 
          } 
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
          }
        }
      ]);
      
      if (variantSales.length > 0) {
        detailView.salesInfo.totalSales = variantSales[0].totalSales;
        detailView.salesInfo.totalRevenue = variantSales[0].totalRevenue;
      }
      
    } else if (product.productType === PRODUCT_TYPES.VARIABLE) {
      detailView.stockInfo = {
        type: 'variable',
        stockLevelType: product.variantStockLevelType
      };
      
      if (product.variantStockLevelType === VARIANT_STOCK_LEVEL_TYPES.VARIABLE_LEVEL) {
        // Process each variant
        for (const variant of product.variants) {
          // Get sales for this specific variant
          const variantSales = await Order.aggregate([
            { $unwind: '$items' },
            { 
              $match: { 
                'items.productId': productId,
                'items.variantId': variant._id 
              } 
            },
            {
              $group: {
                _id: null,
                totalSales: { $sum: '$items.quantity' },
                totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
              }
            }
          ]);

          detailView.variants.push({
            id: variant._id,
            name: variant.variant_name,
            sku: variant.variant_sku,
            stock: variant.variant_totalStock,
            stockStatus: variant.variant_stockStatus,
            price: variant.variant_price,
            specialPrice: variant.variant_specialPrice,
            images: variant.variant_images,
            isActive: variant.variant_isActive,
            sales: variantSales[0]?.totalSales || 0,
            revenue: variantSales[0]?.totalRevenue || 0,
            dimensions: {
              weight: variant.variant_weight,
              height: variant.variant_height,
              breadth: variant.variant_breadth,
              length: variant.variant_length
            }
          });

          // Add to total sales
          detailView.salesInfo.totalSales += variantSales[0]?.totalSales || 0;
          detailView.salesInfo.totalRevenue += variantSales[0]?.totalRevenue || 0;
        }
      } else {
        detailView.stockInfo = {
          sku: product.productLevelStock?.pls_sku,
          stock: product.productLevelStock?.pls_totalStock,
          stockStatus: product.productLevelStock?.pls_stockStatus,
          variantCount: product.variants.length
        };
        
        // Get sales for product-level stock
        const productSales = await Order.aggregate([
          { $unwind: '$items' },
          { $match: { 'items.productId': mongoose.Types.ObjectId(productId) } },
          {
            $group: {
              _id: null,
              totalSales: { $sum: '$items.quantity' },
              totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
            }
          }
        ]);
        
        if (productSales.length > 0) {
          detailView.salesInfo.totalSales = productSales[0].totalSales;
          detailView.salesInfo.totalRevenue = productSales[0].totalRevenue;
        }
      }
    }

    detailView.salesInfo.recentOrders = recentOrders;

    res.status(200).json({
      success: true,
      data: detailView
    });

  } catch (error) {
    console.error('Error fetching product detail view:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product details',
      error: error.message
    });
  }
};

/**
 * Export stock and sales data (CSV/Excel)
 * GET /api/stock-sales/export
 */
exports.exportStockSalesData = async (req, res) => {
  try {
    const {
      category = '',
      seller = '',
      search = '',
      status = '',
      format = 'csv' // or 'excel'
    } = req.query;

    // Build filter query (similar to view)
    const filter = { isDeleted: false };
    
    if (category && category !== 'All Category' && category !== '') {
      filter.categoryId = mongoose.Types.ObjectId(category);
    }
    
    if (seller && seller !== '') {
      filter.vendorId = mongoose.Types.ObjectId(seller);
    }
    
    if (status && status !== '') {
      filter.status = status === 'Active' ? true : false;
    }
    
    if (search && search !== '') {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'simpleProduct.sp_sku': { $regex: search, $options: 'i' } }
      ];
    }

    // Get all products (no pagination for export)
    const products = await Product.find(filter)
      .populate('vendorId', 'name storeName')
      .populate('categoryId', 'name');

    // Get sales data
    const productIds = products.map(p => p._id);
    
    const orderStats = await Order.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.productId': { $in: productIds } } },
      {
        $group: {
          _id: {
            productId: '$items.productId',
            variantId: '$items.variantId'
          },
          totalSales: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      }
    ]);

    // Create sales map
    const salesMap = {};
    orderStats.forEach(stat => {
      const key = stat._id.variantId ? 
        `${stat._id.productId}_${stat._id.variantId}` : 
        stat._id.productId.toString();
      salesMap[key] = {
        sales: stat.totalSales,
        revenue: stat.totalRevenue
      };
    });

    // Prepare export data
    const exportData = [];
    
    products.forEach(product => {
      if (product.productType === PRODUCT_TYPES.SIMPLE) {
        exportData.push({
          'Product ID': product._id.toString(),
          'Product Name': product.name,
          'Category': product.categoryId?.name || 'Uncategorized',
          'Seller': product.vendorId?.storeName || product.vendorId?.name,
          'SKU': product.simpleProduct?.sp_sku || 'N/A',
          'Stock': product.simpleProduct?.sp_totalStock || 0,
          'Price': product.simpleProduct?.sp_price || 0,
          'Special Price': product.simpleProduct?.sp_specialPrice || 0,
          'Status': product.status ? 'Active' : 'Inactive',
          'Total Sales': salesMap[product._id.toString()]?.sales || 0,
          'Total Revenue': salesMap[product._id.toString()]?.revenue || 0,
          'Product Type': 'Simple',
          'Variation': 'Default'
        });
      } else if (product.productType === PRODUCT_TYPES.VARIABLE) {
        if (product.variantStockLevelType === VARIANT_STOCK_LEVEL_TYPES.VARIABLE_LEVEL) {
          product.variants.forEach(variant => {
            const key = `${product._id}_${variant._id}`;
            exportData.push({
              'Product ID': product._id.toString(),
              'Product Name': product.name,
              'Category': product.categoryId?.name || 'Uncategorized',
              'Seller': product.vendorId?.storeName || product.vendorId?.name,
              'SKU': variant.variant_sku || 'N/A',
              'Stock': variant.variant_totalStock || 0,
              'Price': variant.variant_price || 0,
              'Special Price': variant.variant_specialPrice || 0,
              'Status': product.status ? 'Active' : 'Inactive',
              'Total Sales': salesMap[key]?.sales || 0,
              'Total Revenue': salesMap[key]?.revenue || 0,
              'Product Type': 'Variable',
              'Variation': variant.variant_name
            });
          });
        } else {
          exportData.push({
            'Product ID': product._id.toString(),
            'Product Name': product.name,
            'Category': product.categoryId?.name || 'Uncategorized',
            'Seller': product.vendorId?.storeName || product.vendorId?.name,
            'SKU': product.productLevelStock?.pls_sku || 'N/A',
            'Stock': product.productLevelStock?.pls_totalStock || 0,
            'Price': 'Varies',
            'Special Price': 'Varies',
            'Status': product.status ? 'Active' : 'Inactive',
            'Total Sales': salesMap[product._id.toString()]?.sales || 0,
            'Total Revenue': salesMap[product._id.toString()]?.revenue || 0,
            'Product Type': 'Variable (Product Level)',
            'Variation': `${product.variants.length} variants`
          });
        }
      }
    });

    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(exportData);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=stock-sales-export.csv');
      res.status(200).send(csv);
    } else {
      // For Excel, you'd use a library like exceljs
      res.status(200).json({
        success: true,
        data: exportData,
        count: exportData.length
      });
    }

  } catch (error) {
    console.error('Error exporting stock sales data:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting data',
      error: error.message
    });
  }
};

/**
 * Get summary cards for dashboard
 * GET /api/stock-sales/summary
 */
exports.getSummaryCards = async (req, res) => {
  try {
    const vendorId = req.user.role === 'vendor' ? req.user._id : null;
    
    const matchStage = vendorId ? 
      { vendorId: vendorId, isDeleted: false } : 
      { isDeleted: false };

    const summary = await Product.aggregate([
      { $match: matchStage },
      {
        $facet: {
          productStats: [
            {
              $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                publishedProducts: { $sum: { $cond: ['$status', 1, 0] } },
                pendingApproval: { $sum: { $cond: ['$isApproved', 0, 1] } },
                activeVariants: { $sum: { $size: '$variants' } }
              }
            }
          ],
          stockStats: [
            {
              $project: {
                totalStock: {
                  $switch: {
                    branches: [
                      {
                        case: { $in: ['$productType', ['simple_product', 'digital_product']] },
                        then: '$simpleProduct.sp_totalStock'
                      },
                      {
                        case: {
                          $and: [
                            { $eq: ['$productType', 'variable_product'] },
                            { $eq: ['$variantStockLevelType', 'product_level'] }
                          ]
                        },
                        then: '$productLevelStock.pls_totalStock'
                      }
                    ],
                    default: { $sum: '$variants.variant_totalStock' }
                  }
                }
              }
            },
            {
              $group: {
                _id: null,
                totalStock: { $sum: '$totalStock' },
                outOfStock: { $sum: { $cond: [{ $eq: ['$totalStock', 0] }, 1, 0] } },
                lowStock: { $sum: { $cond: [{ $lte: ['$totalStock', 10] }, 1, 0] } }
              }
            }
          ]
        }
      }
    ]);

    // Get sales summary from orders
    const orderMatch = vendorId ? 
      { 'items.vendorId': vendorId} : 
      {};

     const salesSummary = await Order.aggregate([
      // First match orders that have items with the vendorId (if vendor)
      ...(vendorId ? [{ $match: { 'items.vendorId': vendorId } }] : []),
      // Unwind items to work with each item individually
      { $unwind: '$items' },
      // If vendor, filter again to ensure we only get their items
      ...(vendorId ? [{ $match: { 'items.vendorId': vendorId } }] : []),
      {
        $group: {
          _id: null,
          totalOrders: { $addToSet: '$_id' }, // Count unique orders
          totalItemsSold: { $sum: '$items.quantity' },
          totalRevenue: { 
            $sum: { 
              $multiply: [
                { $ifNull: ['$items.price', 0] }, 
                { $ifNull: ['$items.quantity', 0] }
              ] 
            } 
          },
          totalOrderValue: { $sum: { $ifNull: ['$items.subtotal', 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          totalOrders: { $size: '$totalOrders' },
          totalItemsSold: 1,
          totalRevenue: 1,
          averageOrderValue: { 
            $cond: {
              if: { $gt: [{ $size: '$totalOrders' }, 0] },
              then: { $divide: ['$totalOrderValue', { $size: '$totalOrders' }] },
              else: 0
            }
          }
        }
      }
    ]);


    res.status(200).json({
      success: true,
      data: {
        products: summary[0]?.productStats[0] || {
          totalProducts: 0,
          publishedProducts: 0,
          pendingApproval: 0,
          activeVariants: 0
        },
        stock: summary[0]?.stockStats[0] || {
          totalStock: 0,
          outOfStock: 0,
          lowStock: 0
        },
        sales: salesSummary[0] || {
          totalOrders: 0,
          totalItemsSold: 0,
          totalRevenue: 0,
          averageOrderValue: 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching summary cards:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching summary data',
      error: error.message
    });
  }
};

// Helper Functions

function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function formatStockDisplay(stock) {
  if (stock === undefined || stock === null) return 'N/A';
  if (stock === 0) return 'Out of Stock';
  if (stock > 999) return 'Unlimited';
  return stock.toString();
}

function convertToCSV(data) {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header]?.toString() || '';
      return `"${value.replace(/"/g, '""')}"`; // Escape quotes
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}