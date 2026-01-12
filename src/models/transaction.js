const mongoose = require("mongoose");

const TransactionType = {
  WALLET: "wallet",
  TRANSACTION: "transaction",
};

const transactionSchema = new mongoose.Schema(
  {
    // 'wallet' for internal balance movements, 'transaction' for external gateways
    transaction_type: {
      type: String,
      enum: [TransactionType.WALLET, TransactionType.TRANSACTION],
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Can be an Order ID or a custom string like 'wallet-refill-...'
    order_id: {
      type: String,
      default: null,
    },
    // 'credit' (money in), 'debit' (money out), 'bank_transfer', 'delivery_boy_cash'
    type: {
      type: String,
      trim: true,
    },
    // Gateway transaction ID (Razorpay, Stripe, etc.)
    txn_id: {
      type: String,
      trim: true,
      default: null,
    },
    payu_txn_id: {
      type: String,
      trim: true,
      default: null,
    },
    // Use Decimal128 for financial precision
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    // 'success', 'awaiting', 'failed', '1' (from your SQL data)
    status: {
      type: String,
      lowercase: true,
      trim: true,
      default: "awaiting",
    },
    currency_code: {
      type: String,
      default: "INR",
    },
    payer_email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
    },
    // The time the payment gateway confirmed the txn
    transaction_date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast wallet history and admin auditing
transactionSchema.index({ user_id: 1, transaction_type: 1 });
transactionSchema.index({ txn_id: 1 });
transactionSchema.index({ date_created: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
