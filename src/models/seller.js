const mongoose = require('mongoose');


const Status = {
    APPROVED: "approved",
    NOT_APPROVED: "not_approved",
    DEACTIVE: "deactive",
    REMOVED: "removed"
}

const sellerSchema = new mongoose.Schema({
    // Link to the User model we created earlier
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // For SEO friendly URLs (e.g., /store/mafat-ka-maal)
    slug: { type: String, unique: true, sparse: true },
    
    // Converted from comma-separated string to Array of ObjectIds
    category_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],

    store_info: {
        name: { type: String, required: true },
        description: { type: String },
        logo: { type: String }, // Path to the image
        url: { type: String }
    },

    ratings: {
        average: { type: Number, default: 0.00 },
        count: { type: Number, default: 0 }
    },

    bank_details: {
        bank_name: String,
        bank_code: String,
        account_name: String,
        account_number: String
    },

    documents: {
        national_identity_card: String, // Path to file
        address_proof: String,          // Path to file
        pan_number: String
    },

    tax_info: {
        tax_name: String,
        tax_number: String
    },

    // Parsed from the JSON string in the SQL
    permissions: {
        require_products_approval: { type: Boolean, default: true },
        customer_privacy: { type: Boolean, default: true },
        view_order_otp: { type: Boolean, default: true },
        assign_delivery_boy: { type: Boolean, default: true }
    },

    commission: { type: Number, default: 0.00 },
    zipcodes: [{
         type: mongoose.Schema.Types.ObjectId,
        ref: 'Zipcode',
        required: true // Array of serviceable zip codes
    }],
    
    // approved: 1 | not-approved: 2 | deactive: 0 | removed: 7
    status: { 
        type: String, 
        enum: [Status.APPROVED, Status.NOT_APPROVED, Status.DEACTIVE, Status.REMOVED], 
        default: Status.NOT_APPROVED 
    }
}, { 
    timestamps: true
});

// Indexing for faster store searches
sellerSchema.index({ "store_info.name": "text" });

module.exports = mongoose.model('Seller', sellerSchema);