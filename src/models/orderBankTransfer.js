const mongoose = require("mongoose");

const Status = {
  PENDING: "pending",
  REJECTED: "rejected",
  ACCEPTED: "accepted",
};

const orderBankTransferSchema = new mongoose.Schema(
  {
    // Link to the parent Order
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    // Path to the receipt/screenshot uploaded by the user
    attachments: [
      {
        type: String,
        required: true,
      },
    ],

    // Status ("pending", "rejected", "accepted")
    status: {
      type: String,
      enum: [Status.PENDING, Status.REJECTED, Status.ACCEPTED],
      default: Status.PENDING,
    },

    // Optional: Admin remarks for rejection (useful for user feedback)
    admin_remarks: {
      type: String,
      trim: true,
    },
  },
  {
    // date_created mapped to createdAt
    timestamps: true,
  }
);

// Index for Admin Panel lookup (finding pending transfers)
orderBankTransferSchema.index({ status: 1, date_created: -1 });
orderBankTransferSchema.index({ order_id: 1 });

module.exports = mongoose.model("OrderBankTransfer", orderBankTransferSchema);
