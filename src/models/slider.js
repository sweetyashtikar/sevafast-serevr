// under consederation

const mongoose = require('mongoose');

const sliderSchema = new mongoose.Schema({
    // Determines where the slider redirects the user
    // 'default': No redirect/Generic, 'categories': To a category, 'products': To a product
    type: {
        type: String,
        enum: ['default', 'categories', 'products'],
        required: true,
        default: 'default'
    },

    // The ID of the target (Product ID or Category ID)
    // In Mongo, we use a string or ObjectId depending on if it's 'default' or not
    type_id: {
        type: mongoose.Schema.Types.Mixed,
        default: 0
    },

    // Path to the banner image
    image: {
        type: String,
        required: true,
        trim: true
    }
}, { 
    // date_added mapped to createdAt
    timestamps:true
});

// Index to fetch sliders quickly for the homepage
sliderSchema.index({ date_added: -1 });

module.exports = mongoose.model('Slider', sliderSchema);