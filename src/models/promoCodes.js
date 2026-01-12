const mongoose = require("mongoose");

const Status = {
  ACTIVE: "active",
  DISABLED: "disabled",
};
const promoCodeSchema = new mongoose.Schema(
  {
    promo_code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    message: { type: String, trim: true },

    // Validity Period
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },

    // Usage Limits
    no_of_users: { type: Number, default: 0 }, // Total number of unique users allowed
    repeat_usage: { type: Boolean, default: false }, // Can a single user use it multiple times?
    no_of_repeat_usage: { type: Number, default: 1 }, // Max times a single user can use it

    // Constraints
    minimum_order_amount: { type: Number, default: 0 },

    // Discount Details
    discount: { type: Number, required: true },
    discount_type: {
      type: String,
      enum: ["amount", "percentage"],
      required: true,
    },
    max_discount_amount: { type: Number, default: 0 }, // Cap for percentage-based discounts

    // Metadata & Config
    image: { type: String, default: null }, // Link to Media document or path

    status: {
      type: String,
      enum: [Status.ACTIVE, Status.DISABLED],
      default: Status.ACTIVE,
    },
    is_cashback: { type: Boolean, default: false }, // If true, funds go to wallet instead of discount
    list_promocode: { type: Boolean, default: true }, // Should it appear in the "Available Offers" list?
  },
  {
    // date_created mapped to createdAt
    timestamps: true
  }
);

// Indexes for fast verification
promoCodeSchema.index({ promo_code: 1, status: 1 });
promoCodeSchema.index({ end_date: 1 }); // To query active codes

module.exports = mongoose.model("PromoCode", promoCodeSchema);
