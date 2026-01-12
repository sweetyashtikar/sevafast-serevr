const mongoose = require('mongoose');



const attributeSetSchema = new mongoose.Schema({
    // The name of the set (e.g., 'specification', 'Quality')
    name: { 
        type: String, 
        required: true, 
        trim: true,
        unique: true 
    },

    // true for Active, false for Inactive
    status: { 
        type: Boolean, 
        default: true 
    },
}, { 
    timestamps: true // Automatically creates createdAt and updatedAt
});

// Create an index for the name for faster searching
attributeSetSchema.index({ name: 1 });

module.exports = mongoose.model('AttributeSet', attributeSetSchema);