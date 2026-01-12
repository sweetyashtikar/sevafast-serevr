const mongoose = require('mongoose');

const deliveryBoyNotificationSchema = new mongoose.Schema({
    delivery_boy_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Referencing your User/Delivery Boy model
        required: true
    },
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { 
        type: String, 
        required: true 
    }, // e.g., "Order_Assigned", "Order_Cancelled"
}, { 
    timestamps: { createdAt: 'date_created', updatedAt: false } 
});

// Indexing delivery_boy_id for fast retrieval of notification history
deliveryBoyNotificationSchema.index({ delivery_boy_id: 1, date_created: -1 });

module.exports = mongoose.model('DeliveryBoyNotification', deliveryBoyNotificationSchema);