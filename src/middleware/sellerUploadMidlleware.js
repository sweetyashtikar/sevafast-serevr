// middleware/sellerUploadMiddleware.js
const { uploadSellerDocuments, uploadSellerLogo } = require('./uploadconfig');
const cloudinary = require('../config/cloudinary');

/**
 * Middleware to handle seller document uploads
 * Expected files in form-data:
 * - national_identity_card (file)
 * - address_proof (file)
 * - logo (file - optional)
 */
const handleSellerUploads = (req, res, next) => {
    // Create an array to track all upload promises
    const uploadPromises = [];
    
    // Handle logo upload separately (single file)
    const logoUpload = uploadSellerLogo.single('logo');
    
    // Handle document uploads (multiple files)
    const docsUpload = uploadSellerDocuments.fields([
        { name: 'national_identity_card', maxCount: 1 },
        { name: 'address_proof', maxCount: 1 }
    ]);

    // Execute logo upload
    const logoPromise = new Promise((resolve, reject) => {
        logoUpload(req, res, (err) => {
            if (err) {
                // If logo upload fails but is optional, continue without logo
                if (err.message.includes('logo')) {
                    console.log('Logo upload skipped:', err.message);
                    resolve(null);
                } else {
                    reject(err);
                }
            } else {
                resolve(req.file);
            }
        });
    });
    uploadPromises.push(logoPromise);

    // Execute document uploads
    const docsPromise = new Promise((resolve, reject) => {
        docsUpload(req, res, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(req.files);
            }
        });
    });
    uploadPromises.push(docsPromise);

    // Wait for all uploads to complete
    Promise.all(uploadPromises)
        .then(([logoResult, docsResult]) => {
            // Process logo upload result
            if (logoResult) {
                req.uploadedFiles = req.uploadedFiles || {};
                req.uploadedFiles.logo = {
                    url: logoResult.path,
                    public_id: logoResult.filename,
                    format: logoResult.mimetype,
                    size: logoResult.size,
                    secure_url: logoResult.path.replace('http://', 'https://')
                };
            }

            // Process document upload results
            if (docsResult) {
                req.uploadedFiles = req.uploadedFiles || {};
                
                if (docsResult.national_identity_card) {
                    const doc = docsResult.national_identity_card[0];
                    req.uploadedFiles.national_identity_card = {
                        url: doc.path,
                        public_id: doc.filename,
                        format: doc.mimetype,
                        size: doc.size,
                        secure_url: doc.path.replace('http://', 'https://')
                    };
                }

                if (docsResult.address_proof) {
                    const doc = docsResult.address_proof[0];
                    req.uploadedFiles.address_proof = {
                        url: doc.path,
                        public_id: doc.filename,
                        format: doc.mimetype,
                        size: doc.size,
                        secure_url: doc.path.replace('http://', 'https://')
                    };
                }
            }

            next();
        })
        .catch((error) => {
            console.error('Upload error:', error);
            
            // Clean up any uploaded files if there was an error
            if (req.uploadedFiles) {
                cleanupUploadedFiles(req.uploadedFiles);
            }
            
            res.status(400).json({
                success: false,
                message: 'File upload failed',
                error: error.message
            });
        });
};

/**
 * Clean up uploaded files from Cloudinary on error
 */
const cleanupUploadedFiles = async (uploadedFiles) => {
    try {
        const deletePromises = [];
        
        for (const [key, file] of Object.entries(uploadedFiles)) {
            if (file && file.public_id) {
                deletePromises.push(
                    cloudinary.uploader.destroy(file.public_id)
                        .then(result => {
                            console.log(`Cleaned up ${key}: ${file.public_id}`);
                            return result;
                        })
                        .catch(err => {
                            console.error(`Failed to cleanup ${key}:`, err);
                        })
                );
            }
        }
        
        await Promise.all(deletePromises);
    } catch (error) {
        console.error('Error in cleanup:', error);
    }
};

/**
 * Middleware to delete old files when updating
 */
const deleteOldFiles = async (req, res, next) => {
    try {
        // Get seller ID from params or body
        const sellerId = req.params.id || req.body.seller_id;
        
        if (!sellerId) {
            return next();
        }

        // Fetch existing seller to get old file URLs
        const Seller = require('../models/seller');
        const seller = await Seller.findById(sellerId);
        
        if (!seller) {
            return next();
        }

        // Store old files for cleanup after successful update
        req.oldFiles = {};
        
        if (seller.store_info.logo) {
            req.oldFiles.logo = extractPublicId(seller.store_info.logo);
        }
        
        if (seller.documents.national_identity_card) {
            req.oldFiles.national_identity_card = extractPublicId(seller.documents.national_identity_card);
        }
        
        if (seller.documents.address_proof) {
            req.oldFiles.address_proof = extractPublicId(seller.documents.address_proof);
        }
        
        next();
    } catch (error) {
        console.error('Error fetching old files:', error);
        next();
    }
};

/**
 * Extract public_id from Cloudinary URL
 */
const extractPublicId = (url) => {
    if (!url) return null;
    
    try {
        // Cloudinary URL pattern: https://res.cloudinary.com/cloudname/image/upload/v1234567890/folder/filename.jpg
        const matches = url.match(/upload\/(?:v\d+\/)?(.+?)\.(?:jpg|jpeg|png|pdf|doc|docx)/i);
        return matches ? matches[1] : null;
    } catch (error) {
        console.error('Error extracting public_id:', error);
        return null;
    }
};

/**
 * Cleanup old files after successful update
 */
const cleanupOldFiles = async (req, res, next) => {
    // Only cleanup if we have old files and new files were uploaded
    if (!req.oldFiles || !req.uploadedFiles) {
        return next();
    }

    try {
        const deletePromises = [];
        
        for (const [key, publicId] of Object.entries(req.oldFiles)) {
            // Only delete if a new file was uploaded for this field
            if (publicId && req.uploadedFiles[key]) {
                deletePromises.push(
                    cloudinary.uploader.destroy(publicId)
                        .then(result => {
                            console.log(`Deleted old ${key}: ${publicId}`);
                            return result;
                        })
                        .catch(err => {
                            console.error(`Failed to delete old ${key}:`, err);
                        })
                );
            }
        }
        
        await Promise.all(deletePromises);
        next();
    } catch (error) {
        console.error('Error cleaning up old files:', error);
        next();
    }
};

/**
 * Upload progress tracking middleware (optional)
 */
const trackUploadProgress = (req, res, next) => {
    let progress = 0;
    
    // Track progress for each file
    req.on('data', (chunk) => {
        if (req.headers['content-length']) {
            progress += chunk.length;
            const percentage = (progress / req.headers['content-length']) * 100;
            
            // Emit progress event (can be used with WebSockets)
            req.uploadProgress = percentage;
            
            // For API responses, you can add a progress header
            res.setHeader('X-Upload-Progress', percentage.toFixed(2));
        }
    });
    
    next();
};

module.exports = {
    handleSellerUploads,
    deleteOldFiles,
    cleanupOldFiles,
    trackUploadProgress,
    extractPublicId
};