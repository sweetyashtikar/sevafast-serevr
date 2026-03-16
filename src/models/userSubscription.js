const mongoose = require("mongoose");

const userSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
    // Track usage for the current cycle
    usage: {
      freeDeliveriesUsedThisMonth: {
        type: Number,
        default: 0,
      },
      lastBenefitResetDate: {
        type: Date,
        default: Date.now,
      },
      lastBenefitUsedDate: {
        type: Date,
      },
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index for quick lookup of active subscriptions
userSubscriptionSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("UserSubscription", userSubscriptionSchema);
