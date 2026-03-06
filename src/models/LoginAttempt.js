const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
    // The IP address of the user (v4 or v6)
    ip_address: { 
        type: String, 
        trim: true 
    },

    // Usually the email, username, or mobile number used to attempt login
    login: { 
        type: String, 
        required: true,
        trim: true,
        lowercase: true 
    },
    attempt_count: {
        type: Number,
        default: 1,
        min: 1
    },

    // The timestamp of the attempt
    // Note: We use Date type instead of SQL's int(11) for native JS support
    time: { 
        type: Date, 
        default: Date.now 
    }
}, { 
    timestamps: false // We are using our own 'time' field
});

// INDEXES
// 1. Fast lookup for blocking logic
loginAttemptSchema.index({ ip_address: 1, login: 1 });

// 2. TTL INDEX: Automatically delete records after 24 hours (86400 seconds)
// This prevents the collection from growing indefinitely.
loginAttemptSchema.index({ time: 1 }, { expireAfterSeconds: 24 * 60 * 60 }); // 24 hours

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
