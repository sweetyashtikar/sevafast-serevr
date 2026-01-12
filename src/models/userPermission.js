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
        type: Number,
        default: 1
    },
    /**
     * Permissions Object
     * We use a map of objects so we can easily check permissions 
     * like: permissions.orders.read
     */
    permissions: {
        type: Map,
        of: {
            create: { type: String, 
                enum: [permission.ON, permission.OFF], 
                default: permission.OFF },
            read:   { type: String, 
                enum: [permission.ON, permission.OFF], 
                default: permission.OFF },
            update: { type: String, 
                enum: [permission.ON, permission.OFF], 
                default: permission.OFF },
            delete: { type: String,
                 enum: [permission.ON, permission.OFF],
                  default: permission.OFF }
        }
    }
}, { 
    timestamps: true
});

// Index for fast permission lookup during API requests
userPermissionSchema.index({ user_id: 1 });

module.exports = mongoose.model('UserPermission', userPermissionSchema);