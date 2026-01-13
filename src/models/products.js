const mongoose = require("mongoose");
const {
 PRODUCT_TYPES,
  INDICATOR_TYPES,
    DELIVERABLE_TYPES,
    STOCK_STATUS,
    CANCELABLE_STAGES,
    VIDEO_TYPES,
    DOWNLOAD_LINK_TYPES,
    VARIANT_STOCK_LEVEL_TYPES
} = require("../types/productTypes");

// Variant sub-schema for variable products
const variantSchema = new mongoose.Schema(
  {
    // Variant identification
    variantIds: {
      type: String,
      required: true,
      trim: true,
      // Example: "3 5" means attribute_value_id 3 and 5
      // Like "Size: Large (id=3)" + "Color: Red (id=5)"
    },

    // Pricing
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    specialPrice: {
      type: Number,
      min: 0,
      validate: {
        validator: function (value) {
          return !value || value < this.price;
        },
        message: "Special price must be less than regular price",
      },
    },

    // Stock management (when variant_stock_level_type = 'variable_level')
    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },
    totalStock: {
      type: Number,
      min: 0,
      default: 0,
    },
    stockStatus: {
      type: String,
      enum: [STOCK_STATUS.IN_STOCK, STOCK_STATUS.OUT_OF_STOCK],
      default: STOCK_STATUS.IN_STOCK,
    },
    

    // Dimensions (optional per variant)
    weight: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    breadth: { type: Number, min: 0 },
    length: { type: Number, min: 0 },

    // Media
    images: [
      {
        type: String,
        trim: true,
      },
    ],

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

// Main Product Schema
const productSchema = new mongoose.Schema(
  {
    // ==========================================
    // BASIC INFORMATION
    // ==========================================

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Vendor ID is required"],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [3, "Product name must be at least 3 characters"],
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    shortDescription: {
      type: String,
      trim: true,
      maxlength: [500, "Short description cannot exceed 500 characters"],
    },

    description: {
      type: String,
      trim: true,
    },

    extraDescription: {
      type: String,
      trim: true,
    },

    // ==========================================
    // CATEGORIZATION & CLASSIFICATION
    // ==========================================

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      // required: [true, "Category is required"],
      index: true,
    },

    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    brand: {
      type: String,
      trim: true,
      index: true,
    },

    hsnCode: {
      type: String,
      trim: true,
      uppercase: true,
    },

    madeIn: {
      type: String,
      trim: true,
      default: "India",
    },

    indicator: {
      type: String,
      enum: [
        INDICATOR_TYPES.NONE,
        INDICATOR_TYPES.VEG,
        INDICATOR_TYPES.NON_VEG,
      ],
      default: INDICATOR_TYPES.NONE,
    },

    // Attribute values for variable products
    attributeValues: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AttributeValue",
      },
    ],

    // ==========================================
    // TAX & PRICING
    // ==========================================

    taxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tax",
    },

    isPricesInclusiveTax: {
      type: Boolean,
      default: false,
    },

    // ==========================================
    // INVENTORY MANAGEMENT
    // ==========================================

    totalAllowedQuantity: {
      type: Number,
      min: 1,
      default: 999999,
    },

    minimumOrderQuantity: {
      type: Number,
      min: 1,
      default: 1,
    },

    quantityStepSize: {
      type: Number,
      min: 1,
      default: 1,
    },

    // ==========================================
    // PRODUCT TYPE & STOCK MANAGEMENT
    // ==========================================

    productType: {
      type: String,
      enum: Object.values(PRODUCT_TYPES),
      required: [true, "Product type is required"],
    },

    variantStockLevelType: {
      type: String,
      enum: Object.values(VARIANT_STOCK_LEVEL_TYPES),
      required: function () {
        return this.productType === PRODUCT_TYPES.VARIABLE;
      },
    },

    // ==========================================
    // SIMPLE PRODUCT DATA
    // ==========================================

    simpleProduct: {
      price: {
        type: Number,
        min: 0,
        required: function () {
          return (
            this.productType === PRODUCT_TYPES.SIMPLE ||
            this.productType === PRODUCT_TYPES.DIGITAL
          );
        },
      },

      specialPrice: {
        type: Number,
        min: 0,
        validate: {
          validator: function (value) {
            return !value || value < this.simpleProduct.price;
          },
          message: "Special price must be less than regular price",
        },
      },

      sku: {
        type: String,
        trim: true,
        uppercase: true,
      },

      totalStock: {
        type: Number,
        min: 0,
        default: 0,
      },

    stockStatus: {
      type: String,
      enum: [STOCK_STATUS.IN_STOCK, STOCK_STATUS.OUT_OF_STOCK],
      default: STOCK_STATUS.IN_STOCK,
    },
    },

    // ==========================================
    // VARIABLE PRODUCT DATA
    // ==========================================

    variants: {
      type: [variantSchema],
      validate: {
        validator: function (variants) {
          if (this.productType === PRODUCT_TYPES.VARIABLE) {
            return variants && variants.length > 0;
          }
          return true;
        },
        message: "Variable products must have at least one variant",
      },
    },

    // Product-level stock (when variant_stock_level_type = 'product_level')
    productLevelStock: {
      sku: {
        type: String,
        trim: true,
        uppercase: true,
      },
      totalStock: {
        type: Number,
        min: 0,
        default: 0,
      },
    stockStatus: {
      type: String,
      enum: [STOCK_STATUS.IN_STOCK, STOCK_STATUS.OUT_OF_STOCK],
      default: STOCK_STATUS.IN_STOCK,
    },
    },

    // ==========================================
    // SHIPPING & LOGISTICS
    // ==========================================

    deliverableType: {
      type: String,
      enum: Object.values(DELIVERABLE_TYPES),
      default: DELIVERABLE_TYPES.ALL,
    },

    deliverableZipcodes: [
      {
        type: String,
        trim: true,
      },
    ],

    pickupLocation: {
      type: String,
      trim: true,
    },

    // Dimensions (for simple products or default for variable)
    dimensions: {
      weight: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      breadth: { type: Number, min: 0 },
      length: { type: Number, min: 0 },
    },

    // ==========================================
    // POLICIES & RULES
    // ==========================================

    codAllowed: {
      type: Boolean,
      default: true,
    },

    isReturnable: {
      type: Boolean,
      default: true,
    },

    isCancelable: {
      type: Boolean,
      default: true,
    },

    cancelableTill: {
      type: String,
      enum: Object.values(CANCELABLE_STAGES),
      default: CANCELABLE_STAGES.RECEIVED,
    },

    warrantyPeriod: {
      type: String,
      trim: true,
    },

    guaranteePeriod: {
      type: String,
      trim: true,
    },

    // ==========================================
    // MEDIA & ASSETS
    // ==========================================

    mainImage: {
      type: String,
      // required: [true, "Main product image is required"],
      trim: true,
    },

    otherImages: [
      {
        type: String,
        trim: true,
      },
    ],

    video: {
      type: {
        type: String,
        enum: Object.values(VIDEO_TYPES),
      },
      url: {
        type: String,
        trim: true,
      },
      file: {
        type: String,
        trim: true,
      },
    },

    // ==========================================
    // DIGITAL PRODUCT SPECIFICS
    // ==========================================

    downloadAllowed: {
      type: Boolean,
      default: false,
    },

    downloadLinkType: {
      type: String,
      enum: Object.values(DOWNLOAD_LINK_TYPES),
      required: function () {
        return this.productType === PRODUCT_TYPES.DIGITAL;
      },
    },

    downloadFile: {
      type: String,
      trim: true,
    },

    downloadLink: {
      type: String,
      trim: true,
    },

    // ==========================================
    // STATUS & METADATA
    // ==========================================

    status: {
      type: Boolean,
      default: true,
      index: true,
    },

    isApproved: {
      type: Boolean,
      default: false,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "admin",
    },

    approvedAt: {
      type: Date,
    },

    rejectionReason: {
      type: String,
      trim: true,
    },

    // ==========================================
    // ANALYTICS & TRACKING
    // ==========================================

    views: {
      type: Number,
      default: 0,
    },

    totalSales: {
      type: Number,
      default: 0,
    },

    totalRevenue: {
      type: Number,
      default: 0,
    },

    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },

    // ==========================================
    // SEO
    // ==========================================

    seo: {
      metaTitle: {
        type: String,
        trim: true,
        maxlength: 60,
      },
      metaDescription: {
        type: String,
        trim: true,
        maxlength: 160,
      },
      metaKeywords: [
        {
          type: String,
          trim: true,
        },
      ],
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ==========================================
// INDEXES
// ==========================================

productSchema.index({ vendorId: 1, isActive: 1 });
productSchema.index({ categoryId: 1, isActive: 1 });
productSchema.index({ name: "text", shortDescription: "text", tags: "text" });
productSchema.index({ "simpleProduct.price": 1 });
productSchema.index({ brand: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ totalSales: -1 });
productSchema.index({ "rating.average": -1 });

// ==========================================
// VIRTUAL FIELDS
// ==========================================

// Get effective price (special price if available, otherwise regular price)
productSchema.virtual("effectivePrice").get(function () {
  if (
    this.productType === PRODUCT_TYPES.SIMPLE ||
    this.productType === PRODUCT_TYPES.DIGITAL
  ) {
    return this.simpleProduct.specialPrice || this.simpleProduct.price;
  }
  return null;
});

// Get discount percentage
productSchema.virtual("discountPercentage").get(function () {
  if (
    this.productType === PRODUCT_TYPES.SIMPLE ||
    this.productType === PRODUCT_TYPES.DIGITAL
  ) {
    if (this.simpleProduct.specialPrice && this.simpleProduct.price) {
      const discount =
        ((this.simpleProduct.price - this.simpleProduct.specialPrice) /
          this.simpleProduct.price) *
        100;
      return Math.round(discount);
    }
  }
  return 0;
});

// Check if product is in stock
productSchema.virtual("inStock").get(function () {
  if (this.productType === PRODUCT_TYPES.SIMPLE) {
    return this.simpleProduct.stockStatus === STOCK_STATUS.IN_STOCK;
  }
  if (this.productType === PRODUCT_TYPES.VARIABLE) {
    if (
      this.variantStockLevelType === VARIANT_STOCK_LEVEL_TYPES.PRODUCT_LEVEL
    ) {
      return this.productLevelStock.stockStatus === STOCK_STATUS.IN_STOCK;
    }
    // Check if any variant is in stock
    return this.variants.some((v) => v.stockStatus === STOCK_STATUS.IN_STOCK);
  }
  return true; // Digital products always "in stock"
});

// ==========================================
// MIDDLEWARE
// ==========================================

// Generate slug before saving
productSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Add random suffix to ensure uniqueness
    this.slug += `-${Date.now().toString(36)}`;
  }
});

// Validate deliverable zipcodes based on deliverable type
productSchema.pre("save", function (next) {
  if (
    this.deliverableType === DELIVERABLE_TYPES.INCLUDE ||
    this.deliverableType === DELIVERABLE_TYPES.EXCLUDE
  ) {
    if (!this.deliverableZipcodes || this.deliverableZipcodes.length === 0) {
      return next(
        new Error(
          "Deliverable zipcodes are required for Include/Exclude delivery type"
        )
      );
    }
  }
  // next();
});

// Validate digital product requirements
productSchema.pre("save", function (next) {
  if (this.productType === PRODUCT_TYPES.DIGITAL) {
    if (
      this.downloadLinkType === DOWNLOAD_LINK_TYPES.SELF_HOSTED &&
      !this.downloadFile
    ) {
      return next(
        new Error("Download file is required for self-hosted digital products")
      );
    }
    if (
      this.downloadLinkType === DOWNLOAD_LINK_TYPES.ADD_LINK &&
      !this.downloadLink
    ) {
      return next(
        new Error("Download link is required for linked digital products")
      );
    }
  }
  // next();
});

// ==========================================
// METHODS
// ==========================================

// Check if product can be delivered to a zipcode
productSchema.methods.canDeliverTo = function (zipcode) {
  switch (this.deliverableType) {
    case DELIVERABLE_TYPES.NONE:
      return false;
    case DELIVERABLE_TYPES.ALL:
      return true;
    case DELIVERABLE_TYPES.INCLUDE:
      return this.deliverableZipcodes.includes(zipcode);
    case DELIVERABLE_TYPES.EXCLUDE:
      return !this.deliverableZipcodes.includes(zipcode);
    default:
      return false;
  }
};

// Get variant by IDs
productSchema.methods.getVariantByIds = function (variantIds) {
  return this.variants.find((v) => v.variantIds === variantIds);
};

// Update stock for simple product
productSchema.methods.updateStock = function (quantity) {
  if (this.productType === PRODUCT_TYPES.SIMPLE) {
    this.simpleProduct.totalStock -= quantity;
    if (this.simpleProduct.totalStock <= 0) {
      this.simpleProduct.stockStatus = STOCK_STATUS.OUT_OF_STOCK;
    }
  }
};

// Update stock for variable product
productSchema.methods.updateVariantStock = function (variantIds, quantity) {
  if (this.productType === PRODUCT_TYPES.VARIABLE) {
    if (
      this.variantStockLevelType === VARIANT_STOCK_LEVEL_TYPES.VARIABLE_LEVEL
    ) {
      const variant = this.getVariantByIds(variantIds);
      if (variant) {
        variant.totalStock -= quantity;
        if (variant.totalStock <= 0) {
          variant.stockStatus = STOCK_STATUS.OUT_OF_STOCK;
        }
      }
    } else {
      this.productLevelStock.totalStock -= quantity;
      if (this.productLevelStock.totalStock <= 0) {
        this.productLevelStock.stockStatus = STOCK_STATUS.OUT_OF_STOCK;
      }
    }
  }
};

// Increment views
productSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

// ==========================================
// STATIC METHODS
// ==========================================

// Find active products
productSchema.statics.findActive = function () {
  return this.find({
    isActive: true,
    isDeleted: false,
    isApproved: true,
  });
};

// Search products
productSchema.statics.searchProducts = function (query) {
  return this.find({
    $text: { $search: query },
    isActive: true,
    isDeleted: false,
  });
};

// Get products by category
productSchema.statics.findByCategory = function (categoryId) {
  return this.find({
    categoryId,
    isActive: true,
    isDeleted: false,
    isApproved: true,
  });
};

// Get products by vendor
productSchema.statics.findByVendor = function (vendorId) {
  return this.find({
    vendorId,
    isDeleted: false,
  });
};

module.exports = mongoose.model("Product", productSchema);
