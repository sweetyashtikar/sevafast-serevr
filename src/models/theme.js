const mongoose = require('mongoose');

const Status = {
    INACTIVE: "inactive",
    ACTIVE: "active",
    SELECTABLE: "selectable"
}

const themeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    // Used for URL or Frontend identifiers (e.g., "classic", "modern-dark")
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    // Preview image of the theme
    image: {
        type: String,
        default: null
    },
    // Only one theme should be true at a time
    is_default: {
        type: Boolean,
        default: false
    },
    // 1: Active/Selectable, 0: Inactive
    status: {
        type: String,
        enum: [Status.INACTIVE, Status.ACTIVE, Status.SELECTABLE],
        default: Status.INACTIVE
    }
}, { 
    // created_on mapped to createdAt
    timestamps: { createdAt: 'created_on', updatedAt: 'updated_at' } 
});

// Index to quickly find the active/default theme
themeSchema.index({ is_default: 1 });
themeSchema.index({ slug: 1 });

module.exports = mongoose.model('Theme', themeSchema);