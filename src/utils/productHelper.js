const {PRODUCT_TYPES,DELIVERABLE_TYPES} = require('../types/productTypes');

//helper function for adding product
function mapBasicInfo(body){
  return {
    name : body.name,
    shortDescription : body.short_description,
    description : body.pro_input_description,
    extraDescription : body.extra_input_description,
  }
}

function mapCategorization(body, categoryId,toArray){
  return{
    categoryId,
    tags : toArray(body.tags),
    brand : body.brand,
    hsnCode : body.hsn_code,
    madeIn : body.made_in || 'India',
    indicator : body.indicator || INDICATOR_TYPES.NONE,
    attributeValues : body.attributeValues,
  }
}

function mapTaxPricing(body, toBool){
  return{
    taxId : body.taxId,
    isPricesInclusiveTax : toBool(body.is_prices_inclusive_tax),
  }
}

function mapInventory(body, toInt){
  return{
    totalAllowedQuantity : toInt(body.total_allowed_quantity, 999999),
    minimumOrderQuantity : toInt(body.minimum_order_quantity, 1),
    quantityStepSize : toInt(body.quantity_step_size, 1),
  }
}

function mapProductType(body){
  return{
    productType : body.productType,
    variantStockLevelType : body.variant_stock_level_type,
}
}

function mapShipping(body, toInt, toArray){
  return{
    deliverableType : body.deliverable_type || DELIVERABLE_TYPES.ALL,
    deliverableZipcodes : toArray(body.deliverable_zipcodes),
    pickupLocation : body.pickup_location,
  }
}

function mapDimensions(body, toFloat){
  return{
    dimensions : {
      weight : toFloat(body.weight),
      height : toFloat(body.height),
      breadth : toFloat(body.breadth),
      length : toFloat(body.length)
    }
  }
}

function mapPolicies(body, toBool) {
  return {
    codAllowed: toBool(body.cod_allowed),
    isReturnable: toBool(body.is_returnable),
    isCancelable: toBool(body.is_cancelable),
    cancelableTill: body.cancelable_till,
    warrantyPeriod: body.warranty_period,
    guaranteePeriod: body.guarantee_period
  };
}

function mapMedia(body) {
  return {
    mainImage: body.pro_input_image,
    otherImages: body.other_images || [],
    video: {
      type: body.video_type,
      url: body.video,
      file: body.pro_input_video
    }
  };
}

function mapDigitalProduct(body, toBool) {
  return {
    downloadAllowed: toBool(body.download_allowed),
    downloadLinkType: body.download_link_type,
    downloadFile: body.pro_input_zip,
    downloadLink: body.download_link
  };
}

function addProductTypeData(productData, body, toInt, toFloat, toArray) {
  const { productType } = body;

  // Simple Product
  if (productType === PRODUCT_TYPES.SIMPLE) {
    productData.simpleProduct = {
      price: toFloat(body.simple_price),
      specialPrice: body.simple_special_price ? toFloat(body.simple_special_price) : undefined,
      sku: body.product_sku,
      totalStock: toInt(body.product_total_stock),
      stockStatus: body.simple_product_stock_status !== undefined ? 
        body.simple_product_stock_status : STOCK_STATUS.IN_STOCK
    };
  }

  // Digital Product
  if (productType === PRODUCT_TYPES.DIGITAL) {
    productData.simpleProduct = {
      price: toFloat(body.simple_price),
      specialPrice: body.simple_special_price ? toFloat(body.simple_special_price) : undefined
    };
  }

  // Variable Product
  if (productType === PRODUCT_TYPES.VARIABLE) {
    productData.variants = buildVariants(body, toInt, toFloat);

    // Product level stock management
    if (body.variant_stock_level_type === STOCK_LEVEL_TYPES.PRODUCT_LEVEL) {
      productData.productLevelStock = {
        sku: body.sku_variant_type,
        totalStock: toInt(body.total_stock_variant_type),
        stockStatus: body.variant_status || STOCK_STATUS.IN_STOCK
      };
    }
  }
}

function buildVariants(body, toInt, toFloat) {
  const variantIds = body.variants_ids.split(',').map(v => v.trim());
  const prices = body.variant_price.split(',').map(p => toFloat(p));
  const specialPrices = body.variant_special_price ? 
    body.variant_special_price.split(',').map(p => toFloat(p)) : [];

  // Pre-split dimension arrays if they exist
  const dimensions = {
    weight: body.weight ? body.weight.split(',') : [],
    height: body.height ? body.height.split(',') : [],
    breadth: body.breadth ? body.breadth.split(',') : [],
    length: body.length ? body.length.split(',') : []
  };

  // Variable level stock arrays
  const stockData = body.variant_stock_level_type === STOCK_LEVEL_TYPES.VARIABLE_LEVEL ? {
    skus: body.variant_sku ? body.variant_sku.split(',') : [],
    stocks: body.variant_total_stock ? body.variant_total_stock.split(',') : [],
    statuses: body.variant_level_stock_status ? body.variant_level_stock_status.split(',') : []
  } : null;

  return variantIds.map((ids, i) => {
    const variant = {
      variantIds: ids,
      price: prices[i],
      specialPrice: specialPrices[i] || undefined,
      images: body.variant_images?.[i] || [],
      weight: dimensions.weight[i] ? toFloat(dimensions.weight[i]) : 0,
      height: dimensions.height[i] ? toFloat(dimensions.height[i]) : 0,
      breadth: dimensions.breadth[i] ? toFloat(dimensions.breadth[i]) : 0,
      length: dimensions.length[i] ? toFloat(dimensions.length[i]) : 0
    };

    // Add variable level stock data if applicable
    if (stockData) {
      variant.sku = stockData.skus[i] || '';
      variant.totalStock = toInt(stockData.stocks[i]);
      variant.stockStatus = toInt(stockData.statuses[i], STOCK_STATUS.IN_STOCK);
    }

    return variant;
  });
}



//helper function for updating product
const shouldUpdate = (val) => val !== undefined && val !== null && val !== '';

// Update functions
function updateBasicInfo(product, body) {
  if (shouldUpdate(body.name)) product.name = body.name;
  if (shouldUpdate(body.short_description)) product.shortDescription = body.short_description;
  if (shouldUpdate(body.pro_input_description)) product.description = body.pro_input_description;
  if (shouldUpdate(body.extra_input_description)) product.extraDescription = body.extra_input_description;
}

function updateCategorization(product, body, toArray, toInt) {
  if (shouldUpdate(body.tags)) product.tags = toArray(body.tags);
  if (shouldUpdate(body.brand)) product.brand = body.brand;
  if (shouldUpdate(body.hsn_code)) product.hsnCode = body.hsn_code;
  if (shouldUpdate(body.made_in)) product.madeIn = body.made_in;
  if (shouldUpdate(body.indicator)) product.indicator = body.indicator;
  if (shouldUpdate(body.attribute_values)) product.attributeValues = toArray(body.attribute_values);
}

function updateTaxPricing(product, body, toBool) {
  if (shouldUpdate(body.pro_input_tax)) product.taxId = body.pro_input_tax;
  if (shouldUpdate(body.is_prices_inclusive_tax)) {
    product.isPricesInclusiveTax = toBool(body.is_prices_inclusive_tax);
  }
}

function updateInventory(product, body, toInt) {
  if (shouldUpdate(body.total_allowed_quantity)) {
    product.totalAllowedQuantity = toInt(body.total_allowed_quantity, 999999);
  }
  if (shouldUpdate(body.minimum_order_quantity)) {
    product.minimumOrderQuantity = toInt(body.minimum_order_quantity, 1);
  }
  if (shouldUpdate(body.quantity_step_size)) {
    product.quantityStepSize = toInt(body.quantity_step_size, 1);
  }
}

function updateShipping(product, body, toInt, toArray) {
  if (shouldUpdate(body.deliverable_type)) {
    product.deliverableType = body.deliverable_type || DELIVERABLE_TYPES.ALL;
  }
  if (shouldUpdate(body.deliverable_zipcodes)) {
    product.deliverableZipcodes = toArray(body.deliverable_zipcodes);
  }
  if (shouldUpdate(body.pickup_location)) {
    product.pickupLocation = body.pickup_location;
  }
}

function updateDimensions(product, body, toFloat) {
  if (!product.dimensions) product.dimensions = {};
  
  if (shouldUpdate(body.weight)) product.dimensions.weight = toFloat(body.weight);
  if (shouldUpdate(body.height)) product.dimensions.height = toFloat(body.height);
  if (shouldUpdate(body.breadth)) product.dimensions.breadth = toFloat(body.breadth);
  if (shouldUpdate(body.length)) product.dimensions.length = toFloat(body.length);
}

function updatePolicies(product, body, toBool) {
  if (shouldUpdate(body.cod_allowed)) product.codAllowed = toBool(body.cod_allowed);
  if (shouldUpdate(body.is_returnable)) product.isReturnable = toBool(body.is_returnable);
  if (shouldUpdate(body.is_cancelable)) product.isCancelable = toBool(body.is_cancelable);
  if (shouldUpdate(body.cancelable_till)) product.cancelableTill = body.cancelable_till;
  if (shouldUpdate(body.warranty_period)) product.warrantyPeriod = body.warranty_period;
  if (shouldUpdate(body.guarantee_period)) product.guaranteePeriod = body.guarantee_period;
}

function updateMedia(product, body) {
  if (shouldUpdate(body.pro_input_image)) product.mainImage = body.pro_input_image;
  if (shouldUpdate(body.other_images)) product.otherImages = body.other_images;
  
  if (!product.video) product.video = {};
  if (shouldUpdate(body.video_type)) product.video.type = body.video_type;
  if (shouldUpdate(body.video)) product.video.url = body.video;
  if (shouldUpdate(body.pro_input_video)) product.video.file = body.pro_input_video;
}

function updateDigitalProduct(product, body, toBool) {
  if (shouldUpdate(body.download_allowed)) {
    product.downloadAllowed = toBool(body.download_allowed);
  }
  if (shouldUpdate(body.download_link_type)) {
    product.downloadLinkType = body.download_link_type;
  }
  if (shouldUpdate(body.pro_input_zip)) product.downloadFile = body.pro_input_zip;
  if (shouldUpdate(body.download_link)) product.downloadLink = body.download_link;
}

function updateProductTypeData(product, body, toInt, toFloat, toArray, isDefined) {
  const { productType } = product;

  // Update Simple Product
  if (productType === PRODUCT_TYPES.SIMPLE) {
    if (!product.simpleProduct) product.simpleProduct = {};
    
    if (isDefined(body.simple_price)) {
      product.simpleProduct.price = toFloat(body.simple_price);
    }
    if (isDefined(body.simple_special_price)) {
      product.simpleProduct.specialPrice = body.simple_special_price ? 
        toFloat(body.simple_special_price) : undefined;
    }
    if (isDefined(body.product_sku)) {
      product.simpleProduct.sku = body.product_sku;
    }
    if (isDefined(body.product_total_stock)) {
      product.simpleProduct.totalStock = toInt(body.product_total_stock);
    }
    if (isDefined(body.simple_product_stock_status)) {
      product.simpleProduct.stockStatus = body.simple_product_stock_status;
    }
  }

  // Update Digital Product
  if (productType === PRODUCT_TYPES.DIGITAL) {
    if (!product.simpleProduct) product.simpleProduct = {};
    
    if (isDefined(body.simple_price)) {
      product.simpleProduct.price = toFloat(body.simple_price);
    }
    if (isDefined(body.simple_special_price)) {
      product.simpleProduct.specialPrice = body.simple_special_price ? 
        toFloat(body.simple_special_price) : undefined;
    }
  }

  // Update Variable Product
  if (productType === PRODUCT_TYPES.VARIABLE) {
    // Only rebuild variants if variant data is provided
    if (isDefined(body.variants_ids) && isDefined(body.variant_price)) {
      product.variants = buildVariants(body, toInt, toFloat);
    }

    // Update product level stock if applicable
    if (body.variant_stock_level_type === STOCK_LEVEL_TYPES.PRODUCT_LEVEL) {
      if (!product.productLevelStock) product.productLevelStock = {};
      
      if (isDefined(body.sku_variant_type)) {
        product.productLevelStock.sku = body.sku_variant_type;
      }
      if (isDefined(body.total_stock_variant_type)) {
        product.productLevelStock.totalStock = toInt(body.total_stock_variant_type);
      }
      if (isDefined(body.variant_status)) {
        product.productLevelStock.stockStatus = toInt(body.variant_status, STOCK_STATUS.IN_STOCK);
      }
    }
  }
}

function buildVariants(body, toInt, toFloat) {
  const variantIds = body.variants_ids.split(',').map(v => v.trim());
  const prices = body.variant_price.split(',').map(p => toFloat(p));
  const specialPrices = body.variant_special_price ? 
    body.variant_special_price.split(',').map(p => toFloat(p)) : [];

  // Pre-split dimension arrays if they exist
  const dimensions = {
    weight: body.weight ? body.weight.split(',') : [],
    height: body.height ? body.height.split(',') : [],
    breadth: body.breadth ? body.breadth.split(',') : [],
    length: body.length ? body.length.split(',') : []
  };

  // Variable level stock arrays
  const stockData = body.variant_stock_level_type === STOCK_LEVEL_TYPES.VARIABLE_LEVEL ? {
    skus: body.variant_sku ? body.variant_sku.split(',') : [],
    stocks: body.variant_total_stock ? body.variant_total_stock.split(',') : [],
    statuses: body.variant_level_stock_status ? body.variant_level_stock_status.split(',') : []
  } : null;

  return variantIds.map((ids, i) => {
    const variant = {
      variantIds: ids,
      price: prices[i],
      specialPrice: specialPrices[i] || undefined,
      images: body.variant_images?.[i] || [],
      weight: dimensions.weight[i] ? toFloat(dimensions.weight[i]) : 0,
      height: dimensions.height[i] ? toFloat(dimensions.height[i]) : 0,
      breadth: dimensions.breadth[i] ? toFloat(dimensions.breadth[i]) : 0,
      length: dimensions.length[i] ? toFloat(dimensions.length[i]) : 0
    };

    // Add variable level stock data if applicable
    if (stockData) {
      variant.sku = stockData.skus[i] || '';
      variant.totalStock = toInt(stockData.stocks[i]);
      variant.stockStatus = toInt(stockData.statuses[i], STOCK_STATUS.IN_STOCK);
    }

    return variant;
  });
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





}