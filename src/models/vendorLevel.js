const mongoose = require('mongoose');

const vendorLevelSchema = new mongoose.Schema({
    subscriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription',
        required: true
    },
    levelName: {
        type: String,
        required: true,
        trim: true
    },
    salesThreshold: {
        type: Number,
        required: true,
        min: 0
    },
    cashbackPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Ensure levelName is unique per subscription
vendorLevelSchema.index({ subscriptionId: 1, levelName: 1 }, { unique: true });
// Ensure salesThreshold is unique per subscription
vendorLevelSchema.index({ subscriptionId: 1, salesThreshold: 1 }, { unique: true });

module.exports = mongoose.model('VendorLevel', vendorLevelSchema);
