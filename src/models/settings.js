const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    // The name of the setting group (e.g., 'system_settings', 'payment_methods', 'privacy_policy')
    variable: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // The actual value.
    // We use 'mongoose.Schema.Types.Mixed' because this can be a String,
    // an Object (for JSON data), or even an Array.
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexing the variable name for lightning-fast configuration lookups
settingsSchema.index({ variable: 1 });

module.exports = mongoose.model("Setting", settingsSchema);
