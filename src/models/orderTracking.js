const mongoose = require("mongoose");

const orderTrackingSchema = new mongoose.Schema(
  {
    // Parent Order reference
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    // Specific Item reference (Crucial for multi-vendor shipping)
    order_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrderItem",
      required: true,
    },

    // Name of the shipping company (e.g., FedEx, DHL, BlueDart)
    courier_agency: {
      type: String,
      trim: true,
      required: true,
    },

    // The tracking number provided by the agency
    tracking_id: {
      type: String,
      required: true,
      trim: true,
    },

    // Direct link to the courier's tracking page
    url: {
      type: String,
      trim: true,
      required: true,
    },
  },
  {
    // date_created mapped to createdAt
    timestamps: true,
  }
);

// Indexes for fast lookup when a user clicks "Track Order"
orderTrackingSchema.index({ order_item_id: 1 });
orderTrackingSchema.index({ order_id: 1 });

module.exports = mongoose.model("OrderTracking", orderTrackingSchema);
