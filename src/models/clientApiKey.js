const mongoose = require('mongoose');


const clientApiKeySchema = new mongoose.Schema({
    // Name of the client (e.g., 'eShop iOS App', 'Android Client')
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },

    // The API Secret key
    // We use select: false so it's not accidentally sent in JSON responses
    secret: { 
        type: String, 
        required: true,
        select: false 
    },

    // true for Active, false for Revoked/Inactive
    status: { 
        type: Boolean, 
        default: true 
    }
}, { 
    timestamps: true 
});

// Indexing the secret for fast lookup during middleware authentication
clientApiKeySchema.index({ secret: 1 });

module.exports = mongoose.model('ClientApiKey', clientApiKeySchema);