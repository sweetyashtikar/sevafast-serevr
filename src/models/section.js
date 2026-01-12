const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true, 
        trim: true 
    },
    short_description: { 
        type: String, 
        trim: true 
    },
    // Defines the layout on the frontend (e.g., 'slider', 'grid', 'horizontal')
    style: { 
        type: String, 
        enum: ['default', 'style_1', 'style_2', 'style_3', 'style_4'], 
        required: true 
    },
    // The sorting order of this row on the homepage
    row_order: { 
        type: Number, 
        default: 0 
    },
    // If product_type is 'custom_products', we use these specific IDs
    product_ids: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product' 
    }],
    // Filter by specific product type
    product_type: { 
        type: String, 
        enum: ['all_products', 'new_added_products', 'products_on_sale', 'most_selling_products', 'custom_products'],
        default: 'all_products'
    },
    // Filter products within these categories for this section
    categories: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Category' 
    }]
}, { 
    // date_added mapped to createdAt
    timestamps: { createdAt: 'date_added', updatedAt: 'updated_at' } 
});

// Index to fetch sections in the correct display order
sectionSchema.index({ row_order: 1 });

module.exports = mongoose.model('Section', sectionSchema);