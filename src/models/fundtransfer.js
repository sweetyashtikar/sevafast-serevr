const mongoose = require("mongoose");

const Status = {
  SUCCESS: "success",
  PENDING: "pending",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

const fundTransferSchema = new mongoose.Schema(
  {
    // Link to the Delivery Boy (User model)
    delivery_boy_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Financial Records
    opening_balance: {
      type: Number,
      required: true,
      default: 0,
    },
    closing_balance: {
      type: Number,
      required: true,
      default: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Transfer amount cannot be negative"],
    },

    // Transaction Status (e.g., 'success', 'pending', 'failed')
    status: {
      type: String,
      enum: [Status.SUCCESS, Status.PENDING, Status.FAILED, Status.CANCELLED],
      lowercase: true,
      default: Status.PENDING,
    },

    message: {
      type: String,
      trim: true,
    },
  },
  {
    // date_created mapped to createdAt
    timestamps: true,
  }
);

// Index for fast financial reporting
fundTransferSchema.index({ delivery_boy_id: 1, date_created: -1 });

module.exports = mongoose.model("FundTransfer", fundTransferSchema);
