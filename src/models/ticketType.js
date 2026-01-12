const mongoose = require("mongoose");

const ticketTypeSchema = new mongoose.Schema(
  {
    // The name of the category (e.g., "Refund Request", "Technical Support")
    title: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  {
    // date_created and updatedAt
    timestamps: true,
  }
);

// Index for fast title lookups
ticketTypeSchema.index({ title: 1 });

module.exports = mongoose.model("TicketType", ticketTypeSchema);
