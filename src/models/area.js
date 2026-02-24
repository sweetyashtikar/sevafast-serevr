const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema({
    // Link to the City model
    city_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'City',
        required: true
    },
    
    // Link to a Zipcode model (if you have one) 
    // or store the ID if migrating from SQL
    zipcode_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Zipcode'
    },

    name: { 
        type: String, 
        required: true, 
        trim: true 
    },

     pincode: {
        type: String,
        trim: true,
        // You might want to keep this for faster queries without populating
    },

    // Delivery Logic (Critical for Checkout)
    minimum_free_delivery_order_amount: { 
        type: Number, 
        default: 100 
    },
    
    delivery_charges: { 
        type: Number, 
        default: 0 
    },

        // Delivery time estimate (useful for checkout)
    estimated_delivery_days: {
        type: Number,
        default: 2,
        min: 1
    },

    // Status to enable/disable delivery to specific areas
    status: { 
        type: Boolean, 
        default: true 
    },
    // For pickup locations vs delivery
    is_deliverable: {
        type: Boolean,
        default: true
    }
}, { 
    timestamps: true 
});

// Compound index: prevents duplicate area names within the same city
areaSchema.index({ city_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Area', areaSchema);