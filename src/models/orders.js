const mongoose = require('mongoose');

const OrderStatus  = {
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

const PaymentStatus = {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    PARTIALLY_REFUNDED: 'partially_refunded'
};

const orderSchema = new mongoose.Schema({
    // Relations
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index:true
    },
    address_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
        index:true
    },
    
    // Snapshot of contact/location at time of order
    mobile: { type: String, required: true },
    address: { type: String, required:true }, // Full formatted address string
    location: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number] } // [longitude, latitude]
    },

    // Financials
    total: { type: Number, required: true, default: 0 },
    delivery_charge: { type: Number, default: 0 },
    is_delivery_charge_returnable: { type: Boolean, default: false },
    wallet_balance_used: { type: Number, default: 0 , min :0},
    
    promo_details: {
        code: { type: String, trim: true },
        discount: { type: Number, default: 0 },
         discount_type: {
            type: String,
            enum: ['percentage', 'fixed'],
            default: 'fixed'
        }
    },
    
    discount: { type: Number, default: 0 }, // Additional manual discounts
     tax_amount: {
        type: Number,
        default: 0,
        min: 0
    },
    total_payable: { type: Number, required: true },
    final_total: { type: Number, required: true },
    
    // === PAYMENT ===
    payment: {
        method: { 
            type: String, 
            required: true,
            enum: Object.values(PaymentMethod)
        },
        status: {
            type: String,
            enum: Object.values(PaymentStatus),
            default: PaymentStatus.PENDING
        },
        transaction_id: { 
            type: String,
            index: true
        },
        paid_at: { type: Date },
        gateway_response: { type: mongoose.Schema.Types.Mixed }
    },

    // === DELIVERY ===
    delivery_info: {
        boy_id: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        },
        assigned_at: { type: Date },
        picked_up_at: { type: Date },
        delivered_at: { type: Date },
        otp: { type: Number },
        otp_verified: { type: Boolean, default: false },
        delivery_attempts: { type: Number, default: 0 },
        time_slot: { type: String }, // "9AM-12PM"
        date: { type: Date }
    },
    
    status: {
        type: String,
        enum: Object.values(OrderStatus),
        default: OrderStatus.RECEIVED,
        index: true
    },

    status_timestamps: {
        received: { type: Date },
        processed: { type: Date },
        shipped: { type: Date },
        delivered: { type: Date },
        cancelled: { type: Date },
        returned: { type: Date }
    },

    notes: { type: String, trim: true },
    
    // Attachments (Parsed from JSON string in SQL to Array in Mongo)
    attachments: [{ type: String }] ,

    // === CANCELLATION/REFUND ===
    cancellation: {
        reason: { type: String },
        initiated_by: {
            type: String,
            enum: ['customer', 'seller', 'admin', 'system']
        },
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        refund_status: {
            type: String,
            enum: ['pending', 'processed', 'failed']
        },
        refund_amount: { type: Number }
    }

}, { 
    // date_added mapped to createdAt
    timestamps: true
});

// Virtual for formatted order number
orderSchema.virtual('order_number').get(function() {
    return `ORD${this.date_added.getFullYear()}${String(this._id).slice(-6).toUpperCase()}`;
});

// Pre-save to update status timestamps
orderSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status) {
        const statusField = this.status.toLowerCase();
        if (!this.status_timestamps[statusField]) {
            this.status_timestamps = this.status_timestamps || {};
            this.status_timestamps[statusField] = new Date();
        }
    }
      // Auto-set delivered_at when status changes to delivered
    if (this.isModified('status') && this.status === OrderStatus.DELIVERED) {
        this.delivery_info.delivered_at = new Date();
        this.payment.status = PaymentStatus.PAID; // Auto-mark as paid for COD
    }
    
    next();
});

// Indexes
orderSchema.index({ user_id: 1, date_added: -1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ 'delivery_info.boy_id': 1, status: 1 });
orderSchema.index({ 'delivery_info.date': 1 });
orderSchema.index({ 'cancellation.refund_status': 1 });

module.exports = mongoose.model('Order', orderSchema);