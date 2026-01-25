 

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


// const checkStatus = async (model , id) => {
//     const validateStatus = await model.findOne(id).select('status');
//     console.log(" validateStatus ", validateStatus);

//     if(!validateStatus){
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid category ID'
//         });
//       }

//     if(!validateStatus.status){
//         return false;
//     }
//     return validateStatus._id;
// }

const checkStatus = async (model, ids) => {

    if(Array.isArray(ids)){
        const activeDoc = await model.find({
            _id : {$in : ids},
            status :true
        }).select('_id')

        if(activeDoc.length !== ids.length){
            return null;
        }
        return activeDoc.map(doc => doc._id);
    }
    const validateStatus = await model.findById(ids).select('status');    
    if (!validateStatus || !validateStatus.status) {
        return null; // Return null for invalid/inactive
    }
    
    return validateStatus._id;
}

const checkId  = async(model, ids) => {

    if(Array.isArray(ids)){
        const existingDocs = await model.find({
            _id : {$in : ids}
        }).select('_id')
        if(existingDocs.length !== ids.length){
            return null;
        }
        return existingDocs.map(doc => doc._id);
    }
    const validateId = await model.findById(ids).select('_id');
    if (!validateId) {
        return null; // Return null for invalid ID
    }
    return validateId._id;
}

module.exports = {
    sanitizeUser,
    sanitizeUserForPublic,
    sanitizeUserForAdmin,
    sanitizeUserForSelf,
    checkStatus,
    checkId


};