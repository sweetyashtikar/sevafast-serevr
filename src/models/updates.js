const mongoose = require('mongoose');

const updateSchema = new mongoose.Schema({
    // Semantic versioning (e.g., "1.0.0", "2.0.5")
    version: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    // Optional: Description of what changed in this version
    notes: {
        type: String,
        default: ""
    }
}, { 
    // Automatically track when the update was applied
    timestamps: true
});

// Index to quickly find the latest version
updateSchema.index({ applied_at: -1 });

module.exports = mongoose.model('Update', updateSchema);