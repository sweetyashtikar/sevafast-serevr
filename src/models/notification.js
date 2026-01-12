const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true, 
        trim: true,
        maxLength: 128 
    },
    message: { 
        type: String, 
        required: true, 
        maxLength: 512 
    },
    // The target screen for deep linking
    type: { 
        type: String, 
        enum: ['default', 'categories', 'products', 'offers'], 
        default: 'default' 
    },
    // The specific ID of the product or category to open
    // Using Mixed because it could be 0 (default) or an ObjectId
    type_id: { 
        type: mongoose.Schema.Types.Mixed, 
        default: 0 
    },
    // Image URL for rich notifications
    image: { 
        type: String, 
        default: null 
    }
}, { 
    // date_sent mapped to createdAt
    timestamps: { createdAt: 'date_sent', updatedAt: false } 
});

// Index to retrieve history from latest to oldest
notificationSchema.index({ date_sent: -1 });

module.exports = mongoose.model('Notification', notificationSchema);