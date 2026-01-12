const mongoose = require("mongoose");


const attributeSchema = new mongoose.Schema(
  {
    // Link to the Attribute Set (e.g., Clothing, Electronics)
    attribute_set_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttributeSet",
      required: true,
    },

    // The name of the attribute (e.g., 'Color', 'Size')
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // The type of input (e.g., 'dropdown', 'radio', 'checkbox')
    // Defaults to 'text' if NULL in your SQL
    type: {
      type: String,
      default: "text",
    },

    // Status: true for Active, false for Inactive
    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    // Handles date_created (as createdAt) and adds updatedAt
    timestamps: true,
  }
);

// Index for faster lookups when filtering products
attributeSchema.index({ attribute_set_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Attribute", attributeSchema);
