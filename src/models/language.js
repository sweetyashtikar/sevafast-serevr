const mongoose = require('mongoose');

const languageSchema = new mongoose.Schema({
    // Full name of the language (e.g., 'English', 'Arabic', 'Hindi')
    language: { 
        type: String, 
        required: true, 
        trim: true,
        unique: true 
    },

    // ISO Language Code (e.g., 'en', 'ar', 'hi')
    code: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true,
        trim: true,
        maxLength: 8 
    },

    // 1 (true) for Right-to-Left, 0 (false) for Left-to-Right
    is_rtl: { 
        type: Boolean, 
        default: false 
    },

    // Status: To enable or disable a language without deleting it
    status: {
        type: Number,
        enum: [0, 1],
        default: 1
    }
}, { 
    // created_on mapped to createdAt
    timestamps: { createdAt: 'created_on', updatedAt: 'updated_at' } 
});

module.exports = mongoose.model('Language', languageSchema);