const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        // Required only if productType is VARIABLE
        variantId: {
          type: mongoose.Schema.Types.ObjectId,
          // Note: No 'ref' here because variants are sub-documents in Product
        },
        qty: {
          type: Number,
          required: true,
          min: [1, "Quantity cannot be less than 1"],
          default: 1,
        },
      },
    ],
  },
  { timestamps: true }
);



module.exports = mongoose.model("Cart", cartSchema);



// const itemSchema = new mongoose.Schema({
//   product: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Product",
//     required: true,
//   },
//   variantId: {
//     type: mongoose.Schema.Types.ObjectId,
//   },
//   qty: {
//     type: Number,
//     required: true,
//     min: 1,
//     default: 1,
//   },
// }, { _id: false }); // <--- This line prevents the ID creation in the items array

// const cartSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//     index: true,
//   },
//   items: [itemSchema], // Use the sub-schema here
// }, { timestamps: true });