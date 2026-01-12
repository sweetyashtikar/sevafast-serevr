const mongoose = require("mongoose");

const sellerCommissionSchema = new mongoose.Schema(
  {
    // Reference to the User (with 'seller' role)
    seller_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Reference to the Category
    // 0 in SQL is converted to null or a specific "General" category ID in Mongo
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    // The commission percentage (e.g., 10.00 for 10%)
    commission: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0.0,
    },
  },
  {
    // date_created mapped to createdAt
    timestamps: true,
  }
);

// Compound Index: Ensures one seller can't have two different commission rates
// for the exact same category.
sellerCommissionSchema.index(
  { seller_id: 1, category_id: 1 },
  { unique: true }
);

module.exports = mongoose.model("SellerCommission", sellerCommissionSchema);
