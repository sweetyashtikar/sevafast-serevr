const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    // The short name used in code (e.g., 'admin', 'seller')
    name: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        lowercase: true 
    },
    // The human-readable name (e.g., 'Administrator', 'Delivery Boys')
    description: { 
        type: String, 
        required: true,
        trim: true 
    },
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Group', groupSchema);