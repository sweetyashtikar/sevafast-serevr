// Enums for better type safety
const PRODUCT_TYPES = {
  SIMPLE: "simple_product",
  VARIABLE: "variable_product",
  DIGITAL: "digital_product",
};

const INDICATOR_TYPES = {
  NONE: "none",
  VEG: "veg",
  NON_VEG: "non_veg",
};

const DELIVERABLE_TYPES = {
  NONE: "none", // Not shippable (service/local pickup only)
  ALL: "all", // Can ship anywhere
  INCLUDE: "include", // Only specific zipcodes
  EXCLUDE: "exclude", // Everywhere except specific zipcodes
};

const STOCK_STATUS = {
  IN_STOCK: "in-stock",
  OUT_OF_STOCK: "out-of-stock",
  NULL : null
};

const CANCELABLE_STAGES = {
  RECEIVED: "received",
  PROCESSED: "processed",
  SHIPPED: "shipped",
  NOT_RETURNABLE :"not_returnable"
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
