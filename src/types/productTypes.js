// Enums for better type safety
const PRODUCT_TYPES = {
  SIMPLE: "simple_product",
  VARIABLE: "variable_product",
  DIGITAL: "digital_product",
};

const INDICATOR_TYPES = {
  NONE: 0,
  VEG: 1,
  NON_VEG: 2,
};

const DELIVERABLE_TYPES = {
  NONE: 0, // Not shippable (service/local pickup only)
  ALL: 1, // Can ship anywhere
  INCLUDE: 2, // Only specific zipcodes
  EXCLUDE: 3, // Everywhere except specific zipcodes
};

const STOCK_STATUS = {
  IN_STOCK: 1,
  OUT_OF_STOCK: 0,
};

const CANCELABLE_STAGES = {
  RECEIVED: "received",
  PROCESSED: "processed",
  SHIPPED: "shipped",
};

const VIDEO_TYPES = {
  YOUTUBE: "youtube",
  VIMEO: "vimeo",
};

const DOWNLOAD_LINK_TYPES = {
  SELF_HOSTED: "self_hosted",
  ADD_LINK: "add_link",
};

const VARIANT_STOCK_LEVEL_TYPES = {
  PRODUCT_LEVEL: "product_level",
  VARIABLE_LEVEL: "variable_level",
};

module.exports = {
  PRODUCT_TYPES,
  INDICATOR_TYPES,
    DELIVERABLE_TYPES,
    STOCK_STATUS,
    CANCELABLE_STAGES,
    VIDEO_TYPES,
    DOWNLOAD_LINK_TYPES,
    VARIANT_STOCK_LEVEL_TYPES
};
