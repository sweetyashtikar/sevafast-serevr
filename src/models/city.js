const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'City name is required'],
        trim: true
    }
}, { timestamps: true });

// Index name for faster search results
citySchema.index({ name: 'text' });

module.exports = mongoose.model('City', citySchema);