const mongoose = require('mongoose');

const zipcodeSchema = new mongoose.Schema({
    // The postal code (Stored as string to preserve leading zeros if any)
    zipcode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    }
}, { 
    // date_created
    timestamps:  true  
});

// Index is critical here for checking delivery availability during checkout
zipcodeSchema.index({ zipcode: 1 });

module.exports = mongoose.model('Zipcode', zipcodeSchema);