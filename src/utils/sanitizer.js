// utils/userSanitizer.js
const sanitizeUser = (user, options = {}) => {
    const defaultOptions = {
        removePassword: true,
        removeApiKey: true,
        removeSecurity: true,
        removeVersion: true,
        removeTimestamps: false,
        keepId: true
    };
    
    const opts = { ...defaultOptions, ...options };
    
    // Convert to plain object
    const userObject = user.toObject ? user.toObject() : { ...user };
    
    // Define fields to remove based on options
    const fieldsToRemove = [];
    
    if (opts.removePassword) fieldsToRemove.push('password');
    if (opts.removeApiKey) fieldsToRemove.push('apikey');
    if (opts.removeSecurity) fieldsToRemove.push('security');
    if (opts.removeVersion) fieldsToRemove.push('__v');
    if (opts.removeTimestamps) {
        fieldsToRemove.push('createdAt', 'updatedAt');
    }
    
    // Remove fields
    fieldsToRemove.forEach(field => {
        delete userObject[field];
    });
    
    // Convert _id to id if needed
    if (opts.keepId && userObject._id && !userObject.id) {
        userObject.id = userObject._id.toString();
    }
    
    return userObject;
};

// Different sanitization levels
const sanitizeUserForPublic = (user) => {
    return sanitizeUser(user, {
        removePassword: true,
        removeApiKey: true,
        removeSecurity: true,
        removeVersion: true
    });
};

const sanitizeUserForAdmin = (user) => {
    return sanitizeUser(user, {
        removePassword: true,
        removeApiKey: false,  // Admin might need to see API key
        removeSecurity: false, // Admin might need to see security info
        removeVersion: true
    });
};

const sanitizeUserForSelf = (user) => {
    return sanitizeUser(user, {
        removePassword: true,  // Still remove password (hash)
        removeApiKey: false,   // User can see their own API key
        removeSecurity: false, // User can see their security info
        removeVersion: true
    });
};

module.exports = {
    sanitizeUser,
    sanitizeUserForPublic,
    sanitizeUserForAdmin,
    sanitizeUserForSelf
};