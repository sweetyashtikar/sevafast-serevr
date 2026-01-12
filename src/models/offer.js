const mongoose = require('mongoose');

const Type = {
    DEFAULT: 'default',
    CATEGORIES: 'categories',
    PRODUCTS: 'products',
    OFFER_URL: 'offer_url'
};

const Status = {
    ENABLE: 1,
    DISABLE: 0
}

const offerSchema = new mongoose.Schema({
    // The type of redirection (e.g., 'default' just shows image, 'categories' opens a category)
    type: { 
        type: String, 
        enum: [Type.DEFAULT, Type.CATEGORIES, Type.PRODUCTS, Type.OFFER_URL],
        default: Type.DEFAULT 
    },
    
    // The ID of the specific target
    // Mixed allows for 0 (no link) or a MongoDB ObjectId
    type_id: { 
        type: mongoose.Schema.Types.Mixed, 
        default: 0 
    },

    // The banner image path
    image: { 
        type: String, 
        required: true 
    },

    // Optional: Add a status to enable/disable banners without deleting them
    status: {
        type: Number,
        enum: [Status.DISABLE, Status.ENABLE],
        default: Status.ENABLE
    }
}, { 
    // date_added mapped to createdAt
    timestamps: { createdAt: 'date_added', updatedAt: 'updated_at' } 
});

module.exports = mongoose.model('Offer', offerSchema);