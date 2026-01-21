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

    // Delivery Logic (Critical for Checkout)
    minimum_free_delivery_order_amount: { 
        type: String, 
        default: 100 
    },
    
    delivery_charges: { 
        type: String, 
        default: 0 
    },

    // Status to enable/disable delivery to specific areas
    active: { 
        type: Boolean, 
        default: true 
    }
}, { 
    timestamps: true 
});

// Compound index: prevents duplicate area names within the same city
areaSchema.index({ city_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Area', areaSchema);