const mongoose = require("mongoose");


const taxSchema = new mongoose.Schema(
  {
    // Name of the tax (e.g., "GST", "VAT", "Fund Tax")
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // Stored as a number for direct calculation (e.g., 5.0 for 5%)
    percentage: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for active taxes (commonly used in product creation dropdowns)
taxSchema.index({ status: 1 });

module.exports = mongoose.model("Tax", taxSchema);
