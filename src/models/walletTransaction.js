const mongoose = require('mongoose');

const TransactionType = {
    CREDIT: 'credit',
    DEBIT: 'debit'
}

const Status = {
    FAILED: "failed",
    PENDING: "pending",
    SUCCESS: "success",
    CANCELLED: "CANCELLED",
}

const walletTransactionSchema = new mongoose.Schema({
    // Reference to the User (Customer, Seller, or Delivery Boy)
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // 'credit' (adding money) or 'debit' (spending/withdrawing money)
    type: {
        type: String,
        required: true,
        enum: [TransactionType.CREDIT, TransactionType.DEBIT],
        lowercase: true
    },
    // High-precision amount
    amount: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
        min: 0
    },
    // Context (e.g., "Refund for Order #123", "Sign-up Bonus")
    message: {
        type: String,
        trim: true,
        required: true
    },
    // "failed", "pending", "success", "cancelled"
    status: {
        type: String,
        enum: [Status.FAILED, Status.PENDING, Status.SUCCESS, Status.CANCELLED],
        default: Status.PENDING
    }
}, { 
    // date_created and last_updated
    timestamps: true
});

// Indexes for wallet statement generation and filtering
walletTransactionSchema.index({ user_id: 1, date_created: -1 });
walletTransactionSchema.index({ type: 1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);