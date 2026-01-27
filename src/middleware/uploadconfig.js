// middleware/uploadConfig.js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Define allowed file types and sizes
const ALLOWED_FILE_TYPES = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Cloudinary storage configuration for seller documents
const sellerDocsStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'seller_documents',
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }],
        resource_type: 'auto'
    }
});

// Cloudinary storage for seller logos
const sellerLogoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'seller_logos',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'fill' }]
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    // Check file type
    if (!ALLOWED_FILE_TYPES[file.mimetype]) {
        return cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}`), false);
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return cb(new Error(`File size ${file.size} bytes exceeds maximum limit of ${MAX_FILE_SIZE} bytes`), false);
    }
    
    cb(null, true);
};

// Create multer instances
const uploadSellerDocuments = multer({
    storage: sellerDocsStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 3 // Maximum 3 files at once
    }
});

const uploadSellerLogo = multer({
    storage: sellerLogoStorage,
    fileFilter: (req, file, cb) => {
        // Only allow images for logo
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed for logo'), false);
        }
        fileFilter(req, file, cb);
    },
    limits: {
        fileSize: MAX_FILE_SIZE
    }
});

const productImageStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'product_images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 1500, height: 1500, crop: 'limit', quality: 'auto' }]
    }
});

// Cloudinary storage for product videos
const productVideoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'product_videos',
        allowed_formats: ['mp4', 'mov', 'avi'],
        resource_type: 'video'
    }
});

// Create multer instance for products
const uploadProductImages = multer({
    storage: productImageStorage,
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'), false);
        }
         cb(null, true);
    },
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 11 // 1 main + 10 other images
    }
});
const uploadProductVideos = multer({
    storage: productVideoStorage,
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('video/')) {
            return cb(new Error('Only video files are allowed'), false);
        }
        fileFilter(req, file, cb);
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB for videos
    }
});

module.exports = {
    uploadSellerDocuments,
    uploadSellerLogo,
    uploadProductVideos,
    uploadProductImages,
    ALLOWED_FILE_TYPES,
    MAX_FILE_SIZE
};