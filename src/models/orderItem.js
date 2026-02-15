const mongoose = require("mongoose");

const ActiveStatus = {
  AWAITING: "awaiting",
  RECEIVED: "received",
  PROCESSED: "processed",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  RETURNED: "returned",
};

const orderItemSchema = new mongoose.Schema(
  {
    // Primary Relations
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    seller_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    product_variant_id: {
      type: mongoose.Schema.Types.ObjectId,
    },

    // Snapshots (Storing names directly so they persist if the product is deleted)
    product_name: { type: String, required: true },
    variant_name: { type: String },

    // Quantity and Pricing
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    discounted_price: { type: Number },
    tax_percent: { type: Number, default: 0 },
    tax_amount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    sub_total: { type: Number, required: true },

    // Commission Tracking
    admin_commission_amount: { type: Number, default: 0 },
    seller_commission_amount: { type: Number, default: 0 },
    is_credited: { type: Boolean, default: false }, // Has the seller been paid?

     // Status Tracking 
    status: {
      type: String,
      enum: Object.values(ActiveStatus),
      default: ActiveStatus.AWAITING,
      index: true
    },

    // Tracking the status history (JSON string in SQL -> Array of Objects in Mongo)
    status_history: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: { createdAt: "date_added", updatedAt: "updated_at" },
  }
);

// Indexes for fast Seller/Delivery Boy dashboards
orderItemSchema.index({ seller_id: 1, status: 1 });
orderItemSchema.index({ order_id: 1 });

module.exports = mongoose.model("OrderItem", orderItemSchema);
