//not using this file now

// const mongoose = require('mongoose');

// const Availability = {
//     OUT_OF_STOCK: "out_of_stock",
//     IN_STOCK: "in_stock"
// }

// const Status = {
//     INACTIVE: "inactive",
//     ACTIVE: "active"
// }

// const productVariantSchema = new mongoose.Schema({
//     // Reference to the main Product
//     product_id: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Product',
//         required: true
//     },

//     // Array of references to Attribute Values (e.g., IDs for 'Red' and 'Large')
//     // Converted from comma-separated string in SQL
//     attribute_value_ids: [{
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'AttributeValue'
//     }],

//     // Human-readable attribute set (e.g., "Color: Red, Size: XL")
//     attribute_set: {
//         type: String,
//         trim: true
//     },

//     // Pricing
//     price: { 
//         type: Number, 
//         required: true 
//     },
//     special_price: { 
//         type: Number, 
//         default: 0 
//     },

//     // Inventory
//     sku: { 
//         type: String, 
//         trim: true,
//         unique: true, // SKUs should be unique across the system
//         sparse: true  // Allows null if not provided
//     },
//     stock: { 
//         type: Number, 
//         default: 0 
//     },
    
//     // Availability status (0: Out of stock, 1: In stock)
//     availability: { 
//         type: Number, 
//         enum: [Availability.OUT_OF_STOCK, Availability.IN_STOCK],
//         default: Availability.IN_STOCK 
//     },

//     // Variant specific images (Array of strings)
//     images: [{ 
//         type: String 
//     }],

//     // 1: Active, 0: Inactive
//     status: { 
//         type: Number, 
//         enum: [Status.INACTIVE, Status.ACTIVE], 
//         default: Status.ACTIVE 
//     }

// }, { 
//     // date_added mapped to createdAt
//     timestamps: true
// });

// // Indexes for fast lookup
// productVariantSchema.index({ product_id: 1 });
// productVariantSchema.index({ sku: 1 });

// module.exports = mongoose.model('ProductVariant', productVariantSchema);