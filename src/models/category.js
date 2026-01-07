const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    // Self-referencing field: Points to another Category document
    // If it's a top-level category, this will be null
    sub_category: {
       type: String,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    image: {
        type: String,
    },
    banner: {
        type: String,
    },
    row_order: {
        type: Number,
        default: 0
    },
    status: {
        type: String, // "Active" or "Inactive"
        default: "Active",
        enum: ["Active", "Inactive"]
    },
    clicks: {
        type: Number,
        default: 0
    }
}, { 
    timestamps: true // Automatically adds createdAt and updatedAt
});

// Create an index for faster searching by slug
categorySchema.index({ slug: 1 });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;