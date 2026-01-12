const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    // Reference to the User who owns this address
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Reference to the City model we built earlier
    city_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'City',
        required: true
    },
    // Reference to an Area/Neighborhood model (mapped from area_id)
    area_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Area' 
    },
    name: { type: String, trim: true }, // Recipient Name
    type: { 
        type: String, 
        enum: ['Home', 'Office', 'Other', 'home', 'office'], 
        default: 'Home' 
    },
    mobile: { type: String, required: true },
    alternate_mobile: { type: String },
    address: { type: String, required: true },
    landmark: { type: String },
    pincode: { type: String, required: true },
    state: { type: String },
    country: { type: String, default: 'India' },
    country_code: { type: Number, default: 0 },
    
    // Geo-Location (Standardized for MongoDB)
    location: {
        type: { type: String, default: 'Point' },
        coordinates: { 
            type: [Number], // [longitude, latitude]
            index: '2dsphere' // Enables distance-based queries
        }
    },
    
    is_default: { type: Boolean, default: false }
}, { 
    timestamps: true 
});



module.exports = mongoose.model('Address', addressSchema);