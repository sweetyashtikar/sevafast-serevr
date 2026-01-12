const mongoose = require("mongoose");

const productAttributeSchema = new mongoose.Schema(
  {
    // Link to the Parent Product
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // Array of references to the AttributeValues collection
    // e.g., references to IDs for "Small", "Medium", "Large"
    attribute_value_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AttributeValue",
      },
    ],
  },
  {
    // date_created mapped to createdAt
    timestamps: true,
  }
);

// Index for fast lookups when loading product details
productAttributeSchema.index({ product_id: 1 });

module.exports = mongoose.model("ProductAttribute", productAttributeSchema);
