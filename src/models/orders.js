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
    STRIPE: 'Stripe',
    UPI : 'upi'
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
    order_number :{
        type: String,
        unique: true,
        index: true
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
        date: { type: Date },

        ship_type :{
            shipping_method :{
                type:String,
                enum :['standard', 'express', 'shiprocket'],
                default : 'standard'
            },
            //shiprocket specific details
            shiprocket_shipment_id : String,
            shiprocket_awb_number : String,
            shiprocket_status : String,
            shiprocket_label_url : String,
            shiprocket_servicebility : Object,
            shiprocket_response : Object,
            shiprocket_error: String,
            // Original delivery boy fields (keep existing)
            boy_id: mongoose.Schema.Types.ObjectId,
            assigned_at: Date,
            time_slot: String,
            date: Date,
            otp: Number,
            otp_verified: Boolean,
            delivered_at: Date
        },
        default :{}
    },
    
    status: {
        type: String,
        enum: Object.values(OrderStatus),
        default: OrderStatus.PROCESSED,
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

orderSchema.pre('save', function(next) {
    // Generate order number only for new documents
    if (this.isNew && !this.order_number) {
        const year = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        // Generate a unique order number without needing _id
        this.order_number = `ORD${year}${timestamp}${random}`;
    }
    
    // Update status timestamps
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
        this.payment.status = PaymentStatus.PAID;
    }
});

// Add post-save middleware to update order number with actual _id
orderSchema.post('save', function(doc, next) {
    // If order number still has TEMP, update it with actual _id
    if (doc.order_number && doc.order_number.includes('TEMP')) {
        const year = new Date().getFullYear();
        const shortId = String(doc._id).slice(-6).toUpperCase();
        doc.order_number = `ORD${year}${shortId}`;
        
        // Save the updated order number
        doc.constructor.findByIdAndUpdate(doc._id, { 
            order_number: doc.order_number 
        }).then(() => next()).catch(next);
    } else {
        next();
    }
});

// Fix the indexes - replace date_added with createdAt
orderSchema.index({ user_id: 1, createdAt: -1 }); // Fixed this line
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ 'delivery_info.boy_id': 1, status: 1 });
orderSchema.index({ 'delivery_info.date': 1 });
orderSchema.index({ 'cancellation.refund_status': 1 });

module.exports = mongoose.model('Order', orderSchema);
module.exports.OrderStatus = OrderStatus;
module.exports.PaymentMethod = PaymentMethod;
module.exports.PaymentStatus = PaymentStatus;