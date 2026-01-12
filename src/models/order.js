const mongoose = require('mongoose');

const Status = {
    RECEIVED: 'received',
    PROCESSED: 'processed',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    RETURNED: 'returned'
};

const PaymentMethod = {
    COD: 'COD',
    PAYPAL: 'PayPal',
    BANK_TRANSFER: 'bank_transfer',
    RAZORPAY: 'Razorpay',
    STRIPE: 'Stripe'
}
const orderSchema = new mongoose.Schema({
    // Relations
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    address_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address'
    },
    
    // Snapshot of contact/location at time of order
    mobile: { type: String, required: true },
    address: { type: String }, // Full formatted address string
    location: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number] } // [longitude, latitude]
    },

    // Financials
    total: { type: Number, required: true, default: 0 },
    delivery_charge: { type: Number, default: 0 },
    is_delivery_charge_returnable: { type: Boolean, default: false },
    wallet_balance_used: { type: Number, default: 0 },
    
    promo_details: {
        code: { type: String, trim: true },
        discount: { type: Number, default: 0 }
    },
    
    discount: { type: Number, default: 0 }, // Additional manual discounts
    total_payable: { type: Number, required: true },
    final_total: { type: Number, required: true },
    
    payment_method: { 
        type: String, 
        required: true,
        enum: [PaymentMethod.COD, PaymentMethod.PAYPAL, PaymentMethod.BANK_TRANSFER, PaymentMethod.RAZORPAY, PaymentMethod.STRIPE] 
    },

    // Scheduling & Status
    delivery_time: { type: String }, // e.g., "Morning (9AM - 12PM)"
    delivery_date: { type: Date },
    otp: { type: Number, default: 0 }, // For secure delivery verification
    
    status: {
        type: String,
        enum: [Status.RECEIVED, Status.PROCESSED, Status.SHIPPED, Status.DELIVERED, Status.CANCELLED, Status.RETURNED],
        default: Status.RECEIVED
    },

    notes: { type: String, trim: true },
    
    // Attachments (Parsed from JSON string in SQL to Array in Mongo)
    attachments: [{ type: String }] 

}, { 
    // date_added mapped to createdAt
    timestamps: { createdAt: 'date_added', updatedAt: 'updated_at' } 
});

// Indexing for Admin Dashboards and User History
orderSchema.index({ user_id: 1, date_added: -1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);