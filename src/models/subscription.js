const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["customer", "vendor"],
      required: true,
    },
    duration: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    features: [
      {
        type: String,
      },
    ],
    benefits: {
      freeDeliveryThreshold: {
        type: Number,
        default: 0,
      },
      freeDeliveriesPerMonth: {
        type: Number,
        default: 0,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
