const mongoose = require('mongoose');

const customNotificationSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    type: { type: String }, // e.g., "Promotion", "Update"
    // In SQL this was 'date_sent', we use 'createdAt' via timestamps
}, { 
    timestamps: true
});

module.exports = mongoose.model('CustomNotification', customNotificationSchema);