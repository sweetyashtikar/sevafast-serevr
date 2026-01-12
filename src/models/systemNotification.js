const mongoose = require('mongoose');

const Type  = {
    PLACE_ORDER: 'place_order',
    PAYMENT: 'payment',
    RETURN: 'return',
    SYSTEM: 'system',
    PROMOTION: 'promotion'
}

const ReadStatus = {
    UNREAD: "unread",
    READ: "read"
}

const systemNotificationSchema = new mongoose.Schema({
    // Optional: Link to a specific user (Admin, Seller, or Customer)
    // If null, it could be a global broadcast
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    // Category of notification (e.g., 'place_order', 'payment_success', 'return_request')
    type: {
        type: String,
        required: true,
        lowercase: true,
        enum: [Type.PLACE_ORDER, Type.PAYMENT, Type.RETURN, Type.SYSTEM, Type.PROMOTION]
    },
    // Reference to the related object (e.g., the Order ID)
    //to be checked
    type_id: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'type_id_ref', // Dynamic reference based on 'type'
        required: true
    },
    // Helper field for dynamic population
    type_id_ref: {
        type: String,
        enum: ['Order', 'Payment', 'ReturnRequest'],
        required: true
    },
    // 0: Unread, 1: Read
    read_by: {
        type: String,
        enum: [ReadStatus.UNREAD, ReadStatus.READ],
        default: ReadStatus.UNREAD
    }
}, { 
    // date_sent mapped to createdAt
    timestamps: { createdAt: 'date_sent', updatedAt: 'updated_at' } 
});

// Indexes for fast retrieval of unread notifications for a user
systemNotificationSchema.index({ user_id: 1, read_by: 1 });
systemNotificationSchema.index({ date_sent: -1 });

module.exports = mongoose.model('SystemNotification', systemNotificationSchema);