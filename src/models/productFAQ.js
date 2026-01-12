const mongoose = require('mongoose');

const productFaqSchema = new mongoose.Schema({
    // The user who asked the question
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // The product this question belongs to
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    question: {
        type: String,
        required: true,
        trim: true
    },
    answer: {
        type: String,
        default: null,
        trim: true
    },
    // 0 usually means not answered, or it could be an Admin/Seller ID
    answered_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // Helpfulness rating
    votes: {
        type: Number,
        default: 0
    },
    // Optional: Array of user IDs who voted to prevent duplicate voting
    voted_by: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { 
    // date_added mapped to createdAt
    timestamps: { createdAt: 'date_added', updatedAt: 'updated_at' } 
});

// Indexes for fast lookup on product pages
productFaqSchema.index({ product_id: 1, date_added: -1 });
// Text index for searching within questions
productFaqSchema.index({ question: 'text' });

module.exports = mongoose.model('ProductFAQ', productFaqSchema);