const mongoose = require('mongoose');



const timeSlotSchema = new mongoose.Schema({
    // Name of the slot (e.g., "Evening Delivery", "Morning Express")
    title: {
        type: String,
        required: true,
        trim: true
    },
    // Start of the delivery window (Format: "16:00:00")
    from_time: {
        type: String,
        required: true
    },
    // End of the delivery window (Format: "05:01:00")
    to_time: {
        type: String,
        required: true
    },
    // The cutoff time to place an order for this slot
    last_order_time: {
        type: String,
        required: true
    },
    // 1: Active, 0: Disabled
    status: {
        type: Boolean,
        default: true
    }
}, { 
    timestamps: { createdAt: 'date_added', updatedAt: 'updated_at' } 
});

// Index for active slots to show on the checkout page
timeSlotSchema.index({ status: 1 });

module.exports = mongoose.model('TimeSlot', timeSlotSchema);