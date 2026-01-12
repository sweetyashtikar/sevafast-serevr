const mongoose = require('mongoose');

const swatcheType = {    
    TeXT: "text",    
    COLOR: "color",    
    IMAGE: "image" 
};



const attributeValueSchema = new mongoose.Schema({
    // Link to the parent Attribute (e.g., 'Size' or 'Color')
    attribute_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Attribute',
        required: true
    },

    // The actual value: 'small', 'blue', '1kg', etc.
    value: { 
        type: String, 
        required: true, 
        trim: true 
    },

    // "text", "color", "image"
    swatche_type: { 
        type: String, 
        enum: [swatcheType.TeXT, swatcheType.COLOR, swatcheType.IMAGE], 
        default: swatcheType.TeXT 
    },

    // Hex code for colors (e.g., #000000) or URL for images
    swatche_value: { 
        type: String, 
        default: '' 
    },

    // Whether this value should appear in the sidebar filters
    filterable: { 
        type: Boolean, 
        default: false 
    },

    // true for Active, false for Inactive
    status: { 
        type: Boolean, 
        default: true 
    }
}, { 
    timestamps: true 
});

// Indexing for performance
attributeValueSchema.index({ attribute_id: 1, status: 1 });
attributeValueSchema.index({ value: 1 });

module.exports = mongoose.model('AttributeValue', attributeValueSchema);