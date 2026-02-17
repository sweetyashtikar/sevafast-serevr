const mongoose = require("mongoose");

const Status = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  PICKED_UP: "picked_up",
  REFUNDED: "refunded",
};

const returnRequestSchema = new mongoose.Schema(
  {
    // Primary Relations
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // Product Details
    product_variant_id: {
          type: mongoose.Schema.Types.ObjectId,
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    order_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrderItem",
      required: true,
    },
    status: {
      type: String,
      enum: [
        Status.PENDING,
        Status.APPROVED,
        Status.REJECTED,
        Status.PICKED_UP,
        Status.REFUNDED,
      ],
      default: Status.PENDING,
    },

    // Admin or User remarks regarding the return reason or rejection
    remarks: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    // date_created mapped to createdAt
    timestamps: true,
  }
);

// Indexes for Admin Dashboard efficiency
returnRequestSchema.index({ status: 1 });
returnRequestSchema.index({ order_id: 1 });
returnRequestSchema.index({ user_id: 1 });

module.exports = mongoose.model("ReturnRequest", returnRequestSchema);
