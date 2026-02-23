// controllers/bannerController.js
const Banner = require('../models/banner');
const Category = require('../models/category');
const { validationResult } = require('express-validator');

// @desc    Create a new banner
// @route   POST /api/banners
// @access  Private/Admin
exports.createBanner = async (req, res) => {
    console.log("Request Body:", req.body);
    console.log("Request File:", req.file); // For single file upload
    // console.log("Request Files:", req.files); // If using multiple files
    
    try {
        // Get image path from uploaded file
        const image = req.file?.path; // For single file upload with field name 'image'
        // OR if using files object:
        // const image = req.files?.image?.[0]?.path;

        // Check if image is required
        if (!image) {
            return res.status(400).json({
                success: false,
                message: 'Banner image is required'
            });
        }

        // Get form data from req.body
        const { 
            bannerType, 
            title, 
            status, 
            category 
        } = req.body;

        // Validate required fields
        if (!bannerType) {
            return res.status(400).json({
                success: false,
                message: 'Banner type is required'
            });
        }

        // If banner type is category, validate category exists
        if (bannerType === 'category' && category) {
            const categoryExists = await Category.findById(category);
            if (!categoryExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Selected category does not exist'
                });
            }
        }

        // Parse status if it comes as string
        const parsedStatus = status === 'true' || status === true;

        // Create banner object
        const bannerData = {
            bannerType,
            image, // Add the uploaded image path
            title: title || '',
            status: parsedStatus,
        };

        // Add category only if bannerType is category
        if (bannerType === 'category' && category) {
            bannerData.category = category;
        }

        console.log("Banner Data to save:", bannerData);

        // Create banner in database
        const banner = await Banner.create(bannerData);

        // Populate category if exists
        if (banner.category) {
            await banner.populate('category', 'name slug');
        }

        res.status(201).json({
            success: true,
            message: 'Banner created successfully',
            data: banner
        });

    } catch (error) {
        console.log("Error creating banner:", error);
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// @desc    Get all banners
// @route   GET /api/banners
// @access  Public
exports.getAllBanners = async (req, res) => {
    try {
        const { 
            bannerType, 
            status,
            page = 1, 
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = {};
        
        if (bannerType) {
            filter.bannerType = bannerType;
        }
        
        if (status !== undefined) {
            filter.status = status === 'true';
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Sorting
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const banners = await Banner.find(filter)
            .populate('category', 'name slug image')
            .sort(sort)
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Banner.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: banners.length,
            total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            data: banners
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching banners',
            error: error.message
        });
    }
};

// @desc    Get single banner
// @route   GET /api/banners/:id
// @access  Public
exports.getBannerById = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id)
            .populate('category', 'name slug image');

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner not found'
            });
        }

        res.status(200).json({
            success: true,
            data: banner
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching banner',
            error: error.message
        });
    }
};

// @desc    Update banner
// @route   PUT /api/banners/:id
// @access  Private/Admin
exports.updateBanner = async (req, res) => {
    console.log("Update Request Body:", req.body);
    console.log("Update Request File:", req.file);
    
    try {
        const { id } = req.params;
        
        // Find existing banner
        const banner = await Banner.findById(id);
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner not found'
            });
        }

        // Get image path from uploaded file (if new image is provided)
        const image = req.file?.path;
        
        // Get form data from req.body
        const { 
            bannerType, 
            title, 
            status, 
            category 
        } = req.body;

        // Validate banner type if provided
        if (bannerType && !bannerType.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Banner type cannot be empty'
            });
        }

        // Determine final values (use new values or keep existing)
        const finalBannerType = bannerType || banner.bannerType;
        
        // If banner type is category, validate category exists
        if (finalBannerType === 'category') {
            const categoryId = category || banner.category;
            if (categoryId) {
                const categoryExists = await Category.findById(categoryId);
                if (!categoryExists) {
                    return res.status(400).json({
                        success: false,
                        message: 'Selected category does not exist'
                    });
                }
            } else if (!banner.category && !category) {
                return res.status(400).json({
                    success: false,
                    message: 'Category is required for category banners'
                });
            }
        }

        // Parse status if it comes as string
        const parsedStatus = status !== undefined 
            ? (status === 'true' || status === true) 
            : banner.status;

        // Create update object with only provided fields
        const updateData = {};
        
        // Only include fields that are provided in the request
        if (bannerType !== undefined) updateData.bannerType = bannerType;
        if (title !== undefined) updateData.title = title;
        if (status !== undefined) updateData.status = parsedStatus;
        if (image) updateData.image = image;
        
        // Handle category based on banner type
        if (finalBannerType === 'category') {
            // If category is provided, update it
            if (category !== undefined) {
                updateData.category = category || null;
            }
            // If category not provided but banner type is category, keep existing category
        } else {
            // If banner type is not category, remove category
            updateData.category = null;
        }

        console.log("Update Data:", updateData);

        // Update banner in database
        const updatedBanner = await Banner.findByIdAndUpdate(
            id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        ).populate('category', 'name slug');

        res.status(200).json({
            success: true,
            message: 'Banner updated successfully',
            data: updatedBanner
        });

    } catch (error) {
        console.log("Error updating banner:", error);
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};
// @desc    Delete banner
// @route   DELETE /api/banners/:id
// @access  Private/Admin
exports.deleteBanner = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner not found'
            });
        }

        await banner.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Banner deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting banner',
            error: error.message
        });
    }
};

// @desc    Update banner status
// @route   PATCH /api/banners/:id/status
// @access  Private/Admin
exports.updateBannerStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (typeof status !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Status field must be a boolean'
            });
        }

        const banner = await Banner.findByIdAndUpdate(
            req.params.id,
            { status },
            {
                new: true,
                runValidators: true
            }
        );

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner not found'
            });
        }

        res.status(200).json({
            success: true,
            data: banner
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating banner status',
            error: error.message
        });
    }
};

// @desc    Bulk update banners status
// @route   PATCH /api/banners/bulk-status
// @access  Private/Admin
exports.bulkUpdateStatus = async (req, res) => {
    try {
        const { bannerIds, status } = req.body;

        if (!Array.isArray(bannerIds) || bannerIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of banner IDs'
            });
        }

        if (typeof status !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Status must be a boolean'
            });
        }

        const result = await Banner.updateMany(
            { _id: { $in: bannerIds } },
            { status }
        );

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} banners updated successfully`,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating banners',
            error: error.message
        });
    }
};

// @desc    Get banners by type
// @route   GET /api/banners/type/:bannerType
// @access  Public
exports.getBannersByType = async (req, res) => {
    try {
        const { bannerType } = req.params;

        // Validate banner type
        const validTypes = [
            'deal of the day',
            'home',
            'header',
            'footer',
            'coupons',
            'about us',
            'category',
            'products',
            'contact us'
        ];

        if (!validTypes.includes(bannerType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid banner type'
            });
        }

        const banners = await Banner.find({
            bannerType,
            status: true
        })
        .populate('category', 'name slug image')
        .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: banners.length,
            data: banners
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching banners by type',
            error: error.message
        });
    }
};

// @desc    Get banner statistics
// @route   GET /api/banners/stats
// @access  Private/Admin
exports.getBannerStats = async (req, res) => {
    try {
        const stats = await Banner.aggregate([
            {
                $group: {
                    _id: '$bannerType',
                    count: { $sum: 1 },
                    activeCount: {
                        $sum: { $cond: ['$status', 1, 0] }
                    },
                    inactiveCount: {
                        $sum: { $cond: ['$status', 0, 1] }
                    }
                }
            },
            {
                $project: {
                    bannerType: '$_id',
                    count: 1,
                    activeCount: 1,
                    inactiveCount: 1,
                    _id: 0
                }
            },
            {
                $sort: { bannerType: 1 }
            }
        ]);

        const totalBanners = await Banner.countDocuments();
        const totalActive = await Banner.countDocuments({ status: true });
        const totalInactive = await Banner.countDocuments({ status: false });

        res.status(200).json({
            success: true,
            data: {
                totalBanners,
                totalActive,
                totalInactive,
                breakdownByType: stats
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching banner statistics',
            error: error.message
        });
    }
};

// @desc    Get banners by category
// @route   GET /api/banners/category/:categoryId
// @access  Public
exports.getBannersByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        // Check if category exists
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        const banners = await Banner.find({
            bannerType: 'category',
            category: categoryId,
            status: true
        });

        res.status(200).json({
            success: true,
            count: banners.length,
            data: banners
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching banners by category',
            error: error.message
        });
    }
};

// @desc    Delete multiple banners
// @route   DELETE /api/banners/bulk
// @access  Private/Admin
exports.bulkDeleteBanners = async (req, res) => {
    try {
        const { bannerIds } = req.body;

        if (!Array.isArray(bannerIds) || bannerIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of banner IDs'
            });
        }

        const result = await Banner.deleteMany({
            _id: { $in: bannerIds }
        });

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} banners deleted successfully`,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting banners',
            error: error.message
        });
    }
};