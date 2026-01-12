const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    // Link to the User
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Link to the specific product variant (size/color combo)
    product_variant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
    },

    // Quantity of the product
    qty: {
      type: Number,
      required: true,
      min: [1, "Quantity cannot be less than 1"],
      default: 1,
    },

    // 0: In Cart, 1: Saved for later (Wishlist-like behavior)
    is_saved_for_later: {
      type: Boolean,
      default: false,
    },
  },
  {
    // date_created mapped to createdAt
    timestamps: true,
  }
);

// Compound index: ensures a user doesn't have the same variant
// as two separate entries in the cart. Instead, you'd update the quantity.
cartSchema.index({ user_id: 1, product_variant_id: 1 }, { unique: true });

module.exports = mongoose.model("Cart", cartSchema);
