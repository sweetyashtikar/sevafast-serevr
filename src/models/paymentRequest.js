const mongoose = require("mongoose");

const Status = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};
const paymentRequestSchema = new mongoose.Schema(
  {
    // Link to the User (Seller or Delivery Boy)
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Identifies if the requester is a 'seller' or 'delivery_boy'
    payment_type: {
      type: String,
      required: true,
      enum: ["seller", "delivery_boy"],
      lowercase: true,
    },

    // The destination for funds (Bank Details, UPI ID, or Wallet Address)
    payment_address: {
      type: String,
      required: true,
      trim: true,
    },

    amount_requested: {
      type: Number,
      required: true,
      min: [1, "Minimum withdrawal amount is 1"],
    },

    // Admin notes (e.g., "Paid via Bank Transfer Ref #123" or "Rejected: Invalid IFSC")
    remarks: {
      type: String,
      trim: true,
      default: null,
    },

    // "pending", "approved", "rejected"
    status: {
      type: String,
      enum: [Status.PENDING, Status.APPROVED, Status.REJECTED],
      default: Status.PENDING,
    },
  },
  {
    // date_created mapped to createdAt
    timestamps: true,
  }
);

// Indexes for Admin Panel management
paymentRequestSchema.index({ status: 1, date_created: -1 });
paymentRequestSchema.index({ user_id: 1 });

module.exports = mongoose.model("PaymentRequest", paymentRequestSchema);
