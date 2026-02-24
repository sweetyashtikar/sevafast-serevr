const {
  PRODUCT_TYPES,
  DELIVERABLE_TYPES,
  VARIANT_STOCK_LEVEL_TYPES,
  STOCK_STATUS,
} = require("../types/productTypes");

 // Helper functions
const toArray = (str) => str ? str.split(',').map(s => s.trim()) : [];
const toInt = (val, def = 0) => parseInt(val) || def;
const toFloat = (val, def = 0) => parseFloat(val) || def;
const toBool = (val) => Boolean(val);
const isDefined = (val) => val !== undefined && val !== null && val !== '';


//helper function for adding product
function mapBasicInfo(body) {
  return {
    name: body.name,
    shortDescription: body.shortDescription,
    description: body.description,
  };
}

function mapCategorization(body, categoryId, toArray) {
  return {
    categoryId,
    tags: body.tags,
    brand: body.brand,
    hsnCode: body.hsnCode,
    madeIn: body.madeIn || "India",
    indicator: body.indicator || INDICATOR_TYPES.NONE,
    attributeValues: body.attributeValues,
  };
}

function mapTaxPricing(body, toBool) {
  return {
    taxId: body.taxId,
    isPricesInclusiveTax: toBool(body.is_prices_inclusive_tax),
  };
}

function mapInventory(body, toInt) {
  return {
    totalAllowedQuantity: toInt(body.totalAllowedQuantity, 999999),
    minimumOrderQuantity: toInt(body.minimumOrderQuantity, 1),
    quantityStepSize: toInt(body.quantityStepSize, 1),
  };
}

function mapProductType(body) {
  return {
    productType: body.productType,
    variantStockLevelType: body.variantStockLevelType,
  };
}

function mapShipping(body, toInt, toArray) {
  return {
    deliverableType: body.deliverableType || DELIVERABLE_TYPES.ALL,
    deliverableZipcodes: body.deliverableZipcodes,
    pickupLocation: body.pickupLocation,
  };
}

function mapDimensions(body, toFloat) {
  return {
    dimensions: {
      weight: toFloat(body.dimensions.weight || body.weight),
      height: toFloat(body.dimensions.height || body.height),
      breadth: toFloat(body.dimensions.breadth || body.breadth),
      length: toFloat(body.dimensions.length || body.length),
    },
  };
}

function mapPolicies(body) {
  console.log(body.codAllowed)
  return {
    codAllowed: body.codAllowed,
    isReturnable: body.isReturnable,
    isCancelable: body.isCancelable,
    cancelableTill: body.cancelableTill,
    warrantyPeriod: body.warrantyPeriod,
    guaranteePeriod: body.guaranteePeriod,
  };
}

function mapMedia(body) {
  return {
     mainImage: mainImageUrl || body.mainImage,
          otherImages: otherImageUrls.length > 0 ? otherImageUrls : 
                       (body.otherImages ? toArray(body.otherImages) : []),
    // mainImage: body.mainImage,
    // otherImages: body.otherImages || [],
    // video: {
    //   videoType: (body.videoType || body.video.videoType),
    //   url: (body.url || body.video.url),
    //   file: (body.pro_input_video || body.video.pro_input_video),
    // },
  };
}

function mapDigitalProduct(body, toBool) {
  return {
    // downloadAllowed: toBool(body.downloadAllowed),
    // downloadLinkType: body.downloadLinkType,
    // downloadFile: body.downloadFile,
    // downloadLink: body.downloadLink,
  };
}

function mapSEO(body){
  return {
    seo: {
      metaTitle: (body.metaTitle || body.seo.metaTitle),
      metaDescription: (body.metaDescription || body.seo.metaDescription),
      metaKeywords: (body.metaKeywords || body.seo.metaKeywords),
    },
  };
}

function addProductTypeData(productData, body, toInt, toFloat, toArray, files) {
  const { productType } = body;

  // Simple Product
  if (productType === PRODUCT_TYPES.SIMPLE) {
    productData.simpleProduct = {
      sp_price: toFloat(body.sp_price || body.simpleProduct.sp_price),
      sp_specialPrice:body.sp_specialPrice || body.simpleProduct.sp_specialPrice? toFloat(body.sp_specialPrice || body.simpleProduct.sp_specialPrice) : undefined,
      sp_sku: body.sp_sku || body.simpleProduct.sp_sku,
      sp_totalStock: toInt(body.sp_totalStock || body.simpleProduct.sp_totalStock || 0),
      sp_stockStatus: body.sp_stockStatus ||  body.simpleProduct.sp_stockStatus || STOCK_STATUS.IN_STOCK,
    };
    // Ensure variants is empty for simple products
    delete productData.variants
    delete productData.productLevelStock;
  }

  // Digital Product
  if (productType === PRODUCT_TYPES.DIGITAL) {
    productData.simpleProduct = {
      sp_price: toFloat(body.sp_price || body.simpleProduct.sp_price),
      sp_specialPrice: body.sp_specialPrice || body.simpleProduct.sp_specialPrice ? toFloat(body.sp_specialPrice || body.simpleProduct.sp_specialPrice) : undefined,
      sp_sku: body.sp_sku || body.simpleProduct.sp_sku || "",
      sp_totalStock: toInt(body.sp_totalStock || body.simpleProduct.sp_totalStock || 0), 
      sp_stockStatus: STOCK_STATUS.IN_STOCK,
    };
    // Ensure variants is empty for digital products
    delete productData.variants 

      if (isDefined(body.variantStockLevelType || body.productType)) {
      // If switching from product-level to variant-level, remove productLevelStock
      if ((body.variantStockLevelType === VARIANT_STOCK_LEVEL_TYPES.VARIABLE_LEVEL) && (body.productType === PRODUCT_TYPES.DIGITAL)) {
        delete product.productLevelStock;
      }
    }
  }

  // Variable Product
  if (productType === PRODUCT_TYPES.VARIABLE) {
    productData.variants = buildVariants(body, toInt, toFloat, files);

    delete productData.simpleProduct;

    // Product level stock management
    if (body.variantStockLevelType === VARIANT_STOCK_LEVEL_TYPES.PRODUCT_LEVEL) {
      productData.productLevelStock = {
        pls_sku: body.pls_sku || body.productLevelStock.pls_sku || "",
        pls_totalStock: toInt(body.pls_totalStock || body.productLevelStock.pls_totalStock || 0),
        pls_stockStatus:body.pls_stockStatus || body.productLevelStock.pls_stockStatus || STOCK_STATUS.IN_STOCK,
      };
    }else {
      // If not product level stock, remove productLevelStock
      delete productData.productLevelStock;
    }
  }
}

// function buildVariants(body, toInt, toFloat,files) {

//   // Parse the mapping if it exists
//   let imageMapping = [];
//    if (body.variant_image_mapping) {
//     try {
//       imageMapping = JSON.parse(body.variant_image_mapping);
//     } catch (e) {
//       console.error('Error parsing variant_image_mapping:', e);
//     }
//   }
  
//   // Get uploaded variant images
//   const uploadedVariantImages = files?.variant_images || [];
  
//   // Create a map of imageId to file path
//   const imagePathMap = {};
//   uploadedVariantImages.forEach((file, index) => {
//     // The filename contains the imageId we set in the frontend
//     const imageId = file.originalname;
//     imagePathMap[imageId] = file.path;
//   });

//   // If variants are sent as an array of objects
//   if (body.variants && Array.isArray(body.variants)) {
//     return body.variants.map((variantData) => {
//       const variant = {
//         variant_name: variantData.variant_name,
//         variant_price: toFloat(variantData.variant_price || variantData.price),
//         variant_specialPrice: variantData.variant_specialPrice || variantData.special_price ? toFloat(variantData.variant_specialPrice || variantData.special_price): undefined,

//         // Stock management
//         variant_sku: variantData.variant_sku || variantData.sku || "",
//         variant_totalStock:variantData.variant_totalStock || variantData.stock_quantity ? toInt(variantData.variant_totalStock || variantData.stock_quantity) : 0,
//         variant_stockStatus:
//           variantData.variant_stockStatus ||
//           variantData.stock_status ||
//           STOCK_STATUS.IN_STOCK,

//         // Dimensions
//         variant_weight:
//           variantData.variant_weight || variantData.weight
//             ? toFloat(variantData.variant_weight || variantData.weight)
//             : undefined,
//         variant_height:
//           variantData.variant_height || variantData.height
//             ? toFloat(variantData.variant_height || variantData.height)
//             : undefined,
//         variant_breadth:
//           variantData.variant_breadth || variantData.breadth
//             ? toFloat(variantData.variant_breadth || variantData.breadth)
//             : undefined,
//         variant_length:
//           variantData.variant_length || variantData.length
//             ? toFloat(variantData.variant_length || variantData.length)
//             : undefined,

//         // Images
//         variant_images: variantData.variant_images
//           ? Array.isArray(variantData.variant_images)
//             ? variantData.variant_images
//             : variantData.variant_images
//                 .split(",")
//                 .map((img) => img.trim())
//                 .filter((img) => img)
//           : [],

//         // Status
//         variant_isActive:
//           variantData.variant_isActive !== undefined
//             ? variantData.variant_isActive
//             : true,
//       };

//       return variant;
//     });
//   }

//   // No variants provided
//   return [];
// }

//helper function for updating product

function buildVariants(body, toInt, toFloat, files) {
  // Parse the mapping if it exists
  let imageMapping = [];
  if (body.variant_image_mapping) {
    try {
      imageMapping = JSON.parse(body.variant_image_mapping);
    } catch (e) {
      console.error('Error parsing variant_image_mapping:', e);
    }
  }
  
  // Get uploaded variant images
  const uploadedVariantImages = files?.variant_images || [];
  
  // Create a map of imageId to file path
  const imagePathMap = {};
  uploadedVariantImages.forEach((file) => {
    const imageId = file.originalname;
    imagePathMap[imageId] = file.path;
  });
  
  // Handle variants - could be string, array of strings, or parsed array
  let variantsArray = [];
  
  if (body.variants) {
    // Case 1: It's already an array of objects (parsed)
    if (Array.isArray(body.variants) && body.variants.length > 0 && typeof body.variants[0] === 'object') {
      variantsArray = body.variants;
    }
    // Case 2: It's a single JSON string
    else if (typeof body.variants === 'string') {
      try {
        variantsArray = JSON.parse(body.variants);
      } catch (e) {
        console.error('Error parsing variants string:', e);
      }
    }
    // Case 3: It's an array of JSON strings (your current case)
    else if (Array.isArray(body.variants)) {
      // Try to parse each item in the array
      try {
        // If the array has one item that contains all variants
        if (body.variants.length === 1) {
          variantsArray = JSON.parse(body.variants[0]);
        } else {
          // If multiple items, they might be separate variants
          // But in your case, it looks like the first item has all data
          // and the second is empty/duplicate
          variantsArray = JSON.parse(body.variants[0]);
        }
      } catch (e) {
        console.error('Error parsing variants array item:', e);
      }
    }
  }
  
  // Ensure we have an array
  if (!Array.isArray(variantsArray)) {
    variantsArray = [];
  }
  
  // Process each variant
  return variantsArray.map((variantData, variantIndex) => {
    // Find all images for this variant from the mapping
    const variantImages = imageMapping
      .filter(mapping => mapping.variantIndex === variantIndex)
      .map(mapping => imagePathMap[mapping.imageId])
      .filter(path => path); // Remove any undefined
    
    // Clean up variant_images_previews from the data
    const { variant_images_previews, ...cleanVariantData } = variantData;
    
    const variant = {
      variant_name: cleanVariantData.variant_name,
      variant_price: toFloat(cleanVariantData.variant_price || cleanVariantData.price),
      variant_specialPrice: cleanVariantData.variant_specialPrice || cleanVariantData.special_price ? toFloat(cleanVariantData.variant_specialPrice || cleanVariantData.special_price) : undefined,

      // Stock management
      variant_sku: cleanVariantData.variant_sku || cleanVariantData.sku || "",
      variant_totalStock: cleanVariantData.variant_totalStock || cleanVariantData.stock_quantity ? toInt(cleanVariantData.variant_totalStock || cleanVariantData.stock_quantity) : 0,
      variant_stockStatus: cleanVariantData.variant_stockStatus || cleanVariantData.stock_status || STOCK_STATUS.IN_STOCK,

      // Dimensions
      variant_weight: cleanVariantData.variant_weight || cleanVariantData.weight ? toFloat(cleanVariantData.variant_weight || cleanVariantData.weight) : undefined,
      variant_height: cleanVariantData.variant_height || cleanVariantData.height ? toFloat(cleanVariantData.variant_height || cleanVariantData.height) : undefined,
      variant_breadth: cleanVariantData.variant_breadth || cleanVariantData.breadth ? toFloat(cleanVariantData.variant_breadth || cleanVariantData.breadth) : undefined,
      variant_length: cleanVariantData.variant_length || cleanVariantData.length ? toFloat(cleanVariantData.variant_length || cleanVariantData.length) : undefined,

      // Images - use the mapped images
      variant_images: variantImages,

      // Status
      variant_isActive: cleanVariantData.variant_isActive !== undefined ? cleanVariantData.variant_isActive : true,
    };

    return variant;
  });
}


const shouldUpdate = (val) => val !== undefined && val !== null && val !== "";

// Update functions
function updateBasicInfo(product, body) {
  if (shouldUpdate(body.name)) product.name = body.name;
  if (shouldUpdate(body.shortDescription)) product.shortDescription = body.shortDescription;
  if (shouldUpdate(body.description)) product.description = body.description;
}

function updateCategorization(product, body, toArray) {
  if (shouldUpdate(body.categoryId)) product.categoryId = body.categoryId;
  if (shouldUpdate(body.tags)) product.tags = body.tags;
  if (shouldUpdate(body.brand)) product.brand = body.brand;
  if (shouldUpdate(body.hsnCode)) product.hsnCode = body.hsnCode;
  if (shouldUpdate(body.madeIn)) product.madeIn = body.madeIn;
  if (shouldUpdate(body.indicator)) product.indicator = body.indicator || INDICATOR_TYPES.NONE;
  if (shouldUpdate(body.attribute_values)) product.attributeValues = body.attribute_values;
}

function updateTaxPricing(product, body, toBool) {
  if (shouldUpdate(body.taxId)) product.taxId = body.taxId;
  if (shouldUpdate(body.isPricesInclusiveTax)) {
    product.isPricesInclusiveTax = toBool(body.isPricesInclusiveTax);
  }
}

function updateInventory(product, body, toInt) {
  if (shouldUpdate(body.totalAllowedQuantity)) {
    product.totalAllowedQuantity = toInt(body.totalAllowedQuantity, 999999);
  }
  if (shouldUpdate(body.minimumOrderQuantity)) {
    product.minimumOrderQuantity = toInt(body.minimumOrderQuantity, 1);
  }
  if (shouldUpdate(body.quantityStepSize)) {
    product.quantityStepSize = toInt(body.quantityStepSize, 1);
  }
}

function updateShipping(product, body, toInt, toArray) {
  if (shouldUpdate(body.deliverableType)) {
    product.deliverableType = body.deliverableType || DELIVERABLE_TYPES.ALL;
  }
  if (shouldUpdate(body.deliverableZipcodes)) {
    product.deliverableZipcodes = body.deliverableZipcodes;
  }
  if (shouldUpdate(body.pickupLocation)) {
    product.pickupLocation = body.pickupLocation;
  }
}

function updateDimensions(product, body, toFloat) {
  if (!product.dimensions) product.dimensions = {};

  if (shouldUpdate(body.weight || body.dimensions.weight))
    product.dimensions.weight = toFloat(body.dimensions.weight || body.weigth);
  if (shouldUpdate(body.height || body.dimensions.height))
    product.dimensions.height = toFloat(body.height || body.dimensions.height);
  if (shouldUpdate(body.breadth || body.dimensions.breadth))
    product.dimensions.breadth = toFloat(body.breadth || body.dimensions.breadth);
  if (shouldUpdate(body.length || body.dimensions.length))
    product.dimensions.length = toFloat(body.length || body.dimensions.length);
}

function updatePolicies(product, body, toBool) {
  if (shouldUpdate(body.codAllowed))
    product.codAllowed = toBool(body.codAllowed);
  if (shouldUpdate(body.isReturnable))
    product.isReturnable = toBool(body.isReturnable);
  if (shouldUpdate(body.isCancelable))
    product.isCancelable = toBool(body.isCancelable);
  if (shouldUpdate(body.cancelableTill))
    product.cancelableTill = body.cancelableTill;
  if (shouldUpdate(body.warrantyPeriod))
    product.warrantyPeriod = body.warrantyPeriod;
  if (shouldUpdate(body.guaranteePeriod))
    product.guaranteePeriod = body.guaranteePeriod;
}

function updateMedia(product, body) {
  if (shouldUpdate(body.mainImage)) product.mainImage = body.mainImage;
  if (shouldUpdate(body.otherImages)) product.otherImages = body.otherImages || [];

  if (!product.video) product.video = {};
  if (shouldUpdate(body.videoType || body.video.videoType)) 
    product.video.videoType = (body.videoType || body.video.videoType);
  if (shouldUpdate(body.url || body.video.url)) 
    product.video.url = (body.url || body.video.url);
  if (shouldUpdate(body.file || body.video.file))
    product.video.file = (body.file || body.video.file);
}

function updateSEO(product, body) {
  if (!product.seo) product.seo = {};
  if (shouldUpdate(body.metaTitle || body.seo.metaTitle)) 
    product.seo.metaTitle = (body.metaTitle || body.seo.metaTitle);
  if (shouldUpdate(body.metaDescription || body.seo.metaDescription))
    product.seo.metaDescription = (body.metaDescription || body.seo.metaDescription);
  if (shouldUpdate(body.metaKeywords || body.seo.metaKeywords)) 
    product.seo.metaKeywords = (body.metaKeywords || body.seo.metaKeywords);
}


function updateDigitalProduct(product, body, toBool) {
  // if (shouldUpdate(body.downloadAllowed)) {
  //   product.downloadAllowed = toBool(body.downloadAllowed);
  // }
  // if (shouldUpdate(body.downloadLinkType)) {
  //   product.downloadLinkType = body.downloadLinkType;
  // }
  // if (shouldUpdate(body.downloadFile)) product.downloadFile = body.downloadFile;
  // if (shouldUpdate(body.downloadLink)) product.downloadLink = body.downloadLink;
}

function updateProductTypeData(product, body, toInt, toFloat, toArray, isDefined) {
  const { productType } = product;

   // Simple Product
  if (productType === PRODUCT_TYPES.SIMPLE) {
    productData.simpleProduct = {
      sp_price: toFloat(body.sp_price || body.simpleProduct.sp_price),
      sp_specialPrice:body.sp_specialPrice || body.simpleProduct.sp_specialPrice? toFloat(body.sp_specialPrice || body.simpleProduct.sp_specialPrice) : undefined,
      sp_sku: body.sp_sku || body.simpleProduct.sp_sku,
      sp_totalStock: toInt(body.sp_totalStock || body.simpleProduct.sp_totalStock || 0),
      sp_stockStatus: body.sp_stockStatus ||  body.simpleProduct.sp_stockStatus || STOCK_STATUS.IN_STOCK,
    };
  }

  // Digital Product
  if (productType === PRODUCT_TYPES.DIGITAL) {
    productData.simpleProduct = {
      sp_price: toFloat(body.sp_price || body.simpleProduct.sp_price),
      sp_specialPrice: body.sp_specialPrice || body.simpleProduct.sp_specialPrice ? toFloat(body.sp_specialPrice || body.simpleProduct.sp_specialPrice) : undefined,
      sp_sku: body.sp_sku || body.simpleProduct.sp_sku || "",
      sp_totalStock: toInt(body.sp_totalStock || body.simpleProduct.sp_totalStock || 0), 
      sp_stockStatus: STOCK_STATUS.IN_STOCK,
    };
      if (isDefined(body.variantStockLevelType || body.productType)) {
        console.log(body.variantStockLevelType)
        console.log(body.productType)
      // If switching from product-level to variant-level, remove productLevelStock
      if ((body.variantStockLevelType === VARIANT_STOCK_LEVEL_TYPES.VARIABLE_LEVEL) && (body.productType === PRODUCT_TYPES.DIGITAL)) {
        delete product.productLevelStock;
      }
    }
  }

  // Variable Product
  if (productType === PRODUCT_TYPES.VARIABLE) {
    productData.variants = buildVariants(body, toInt, toFloat);

    // Product level stock management
    if (body.variantStockLevelType === VARIANT_STOCK_LEVEL_TYPES.PRODUCT_LEVEL) {
      console.log(productData)
      productData.productLevelStock = {
        pls_sku: body.pls_sku || body.productLevelStock.pls_sku || "",
        pls_totalStock: toInt(body.pls_totalStock || body.productLevelStock.pls_totalStock || 0),
        pls_stockStatus:body.pls_stockStatus || body.productLevelStock.pls_stockStatus || STOCK_STATUS.IN_STOCK,
      };
    }
  }
}


module.exports = {
  mapBasicInfo,
  mapCategorization,
  mapTaxPricing,
  mapInventory,
  mapProductType,
  mapShipping,
  mapDimensions,
  mapPolicies,
  mapMedia,

  mapDigitalProduct,
  addProductTypeData,
  updateBasicInfo,
  updateCategorization,
  updateTaxPricing,
  updateInventory,
  updateProductTypeData,
  updateShipping,
  updateDimensions,
  updatePolicies,
  updateMedia,
  updateDigitalProduct,
  mapSEO,
  updateSEO,
  toBool,
  toFloat,
  toInt,
  toArray,
  isDefined
};
