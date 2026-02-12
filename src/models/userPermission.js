const mongoose = require('mongoose');

const permission = {
    ON: 'on',
    OFF: 'off'
}

const userPermissionSchema = new mongoose.Schema({
    // Reference to the specific user (Admin or Staff member)
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    // Numeric Role (e.g., 0 for Super Admin, 1 for Staff/Manager)
    role: {
         type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        required: true,
    },
    /**
     * Permissions Object
     * We use a map of objects so we can easily check permissions 
     * like: permissions.orders.read
     */
    permissions: {
        type: Map,
        of: {
            create: { type: Boolean,  
                default: false},
            read:   { type: Boolean, 
                 default: false},
            update: { type: Boolean, 
                default: false},
            delete: { type: Boolean,
                 default: false},
        }
    }
}, { 
    timestamps: true
});

// Index for fast permission lookup during API requests
userPermissionSchema.index({ user_id: 1 });

module.exports = mongoose.model('UserPermission', userPermissionSchema);