const mongoose = require('mongoose');

const productRatingSchema = new mongoose.Schema({
    // Link to the user who wrote the review
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Link to the product being rated
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    // Numeric rating (usually 1 to 5)
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        default: 0
    },
    // Native array of image paths/URLs
    images: [{
        type: String,
        trim: true
    }],
    // User comments
    comment: {
        type: String,
        trim: true,
        maxLength: 1024,
        default: null
    },
    // Optional: Helpful count (Social proof)
    helpful_count: {
        type: Number,
        default: 0
    }
}, { 
    // data_added mapped to createdAt
    timestamps: { createdAt: 'data_added', updatedAt: 'updated_at' } 
});

// Indexes for fast retrieval
// 1. Get all reviews for a specific product (ordered by newest)
productRatingSchema.index({ product_id: 1, data_added: -1 });
// 2. Prevent a user from reviewing the same product twice
productRatingSchema.index({ user_id: 1, product_id: 1 }, { unique: true });

module.exports = mongoose.model('ProductRating', productRatingSchema);