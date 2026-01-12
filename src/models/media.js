const mongoose = require("mongoose");

const Type = {
  IMAGE: "image",
  VIDEO: "video",
  DOCUMENT: "document",
  ARCHIVE: "archive",
};

const mediaSchema = new mongoose.Schema(
  {
    // 0 usually means Admin in your SQL; in Mongo we link to User/Seller
    seller_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // or 'Seller'
      default: null, // null represents Admin/System uploads
    },
    title: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      required: true,
    }, // Original filename
    extension: {
      type: String,
      lowercase: true,
    }, // e.g., 'png', 'jpg'
    type: {
      type: String,
      enum: [Type.IMAGE, Type.VIDEO, Type.DOCUMENT, Type.ARCHIVE],
      default: Type.IMAGE,
    },
    sub_directory: {
      type: String,
      required: true,
    }, // e.g., 'uploads/media/2021/'
    size: {
      type: Number,
    }, // Stored as bytes (Number) for easier filtering by size
  },
  {
    // date_created mapped to createdAt
    timestamps: true,
  }
);

// Virtual field to get the full file path easily
mediaSchema.virtual("full_path").get(function () {
  return `${this.sub_directory}${this.name}`;
});

// Index for fast searching by title or seller
mediaSchema.index({ title: "text", seller_id: 1 });

module.exports = mongoose.model("Media", mediaSchema);
