const mongoose = require('mongoose');


const Status = {
    APPROVED: "approved",
    NOT_APPROVED: "not_approved",
    DEACTIVE: "deactive",
    REMOVED: "removed"
}

const sellerSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    slug: { type: String, unique: true, sparse: true },
    category_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],

    store_info: {
        name: { type: String, required: true },
        description: { type: String },
        logo: { type: String }, 
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
        national_identity_card: String, 
        address_proof: String,         
        pan_number: String
    },

    tax_info: {
        tax_name: String,
        tax_number: String
    },

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
        required: true 
    }],
    
    status: { 
        type: String, 
        enum: [Status.APPROVED, Status.NOT_APPROVED, Status.DEACTIVE, Status.REMOVED], 
        default: Status.NOT_APPROVED 
    }
}, { 
    timestamps: true
});

sellerSchema.index({ "store_info.name": "text" });

sellerSchema.pre("save", function (next) {
  if (this.isModified("store_info.name") && !this.slug) {
    this.slug = this.store_info.name
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    // Add random suffix to ensure uniqueness
    this.slug += `-${Date.now().toString(36)}`;
  }
});

module.exports = mongoose.model('Seller', sellerSchema);