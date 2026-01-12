const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
    // Link to the User who favorited the product
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Link to the Product
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    }
}, { 
    // Captures when the user favorited the item
    timestamps: { createdAt: 'date_added', updatedAt: false } 
});

// CRITICAL: Prevent a user from favoriting the same product multiple times
favoriteSchema.index({ user_id: 1, product_id: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);