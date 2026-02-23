// controllers/couponController.js
const Coupon = require('../models/coupons');
const {CouponType,DiscountType,UserType} = require('../models/coupons')
const User = require('../models/User');
const Order = require('../models/orders');
const mongoose = require('mongoose');


// ==================== ADMIN CONTROLLERS ====================

// @desc    Create a new coupon
// @route   POST /api/coupons
// @access  Private/Admin
exports.createCoupon = async (req, res) => {
    try {
        console.log("Create Coupon Request:", req.body);
        
        // Get image path if uploaded
        const image = req.file?.path;

        // Destructure request body
        const {
            couponCode,
            title,
            description,
            couponType,
            userType,
            discountType,
            couponValue,
            minOrderAmount,
            maxDiscountAmount,
            expiryDate,
            startDate,
            totalUsageLimit,
            perUserUsageLimit,
            status
        } = req.body;

        // Validate required fields
        if (!couponCode || !title || !description || !couponValue || !expiryDate) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Check if coupon code already exists
        const existingCoupon = await Coupon.findOne({ 
            couponCode: couponCode.toUpperCase() 
        });
        
        if (existingCoupon) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code already exists'
            });
        }

        // Create coupon data
        const couponData = {
            couponCode: couponCode.toUpperCase(),
            title,
            description,
            couponType: couponType || Coupon.schema.path('couponType').defaultValue,
            userType: userType || UserType.ALL,
            discountType: discountType || DiscountType.PERCENTAGE,
            couponValue: Number(couponValue),
            minOrderAmount: Number(minOrderAmount) || 0,
            maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
            expiryDate: new Date(expiryDate),
            startDate: startDate ? new Date(startDate) : new Date(),
            totalUsageLimit: totalUsageLimit ? Number(totalUsageLimit) : null,
            perUserUsageLimit: Number(perUserUsageLimit) || 1,
            status: status === 'true' || status === true,
            image: image || null,
            createdBy: req.user?.id
        };

        // Create coupon
        const coupon = await Coupon.create(couponData);

        res.status(201).json({
            success: true,
            message: 'Coupon created successfully',
            data: coupon
        });

    } catch (error) {
        console.error('Error creating coupon:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get all coupons (with filters)
// @route   GET /api/coupons
// @access  Private/Admin
exports.getAllCoupons = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            couponType,
            discountType,
            userType,
            search,
            sort_by = 'createdAt',
            sort_order = 'desc'
        } = req.query;

        // Build query
        const query = {};

        if (status !== undefined) {
            query.status = status === 'true';
        }

        if (couponType) {
            query.couponType = couponType;
        }

        if (discountType) {
            query.discountType = discountType;
        }

        if (userType) {
            query.userType = userType;
        }

        if (search) {
            query.$or = [
                { couponCode: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get total count
        const total = await Coupon.countDocuments(query);

        // Sorting
        const sort = {};
        sort[sort_by] = sort_order === 'desc' ? -1 : 1;

        // Get coupons
        const coupons = await Coupon.find(query)
            .populate('createdBy', 'username email')
            .populate('updatedBy', 'username email')
            .sort(sort)
            .skip(skip)
            .limit(limitNum)
            .lean();

        // Add virtual fields
        const enrichedCoupons = coupons.map(coupon => ({
            ...coupon,
            isExpired: coupon.expiryDate < new Date(),
            isValid: coupon.status && 
                     coupon.startDate <= new Date() && 
                     coupon.expiryDate >= new Date() &&
                     (coupon.totalUsageLimit === null || coupon.totalUsedCount < coupon.totalUsageLimit),
            remainingUses: coupon.totalUsageLimit ? 
                          Math.max(0, coupon.totalUsageLimit - coupon.totalUsedCount) : 
                          'Unlimited'
        }));

        res.status(200).json({
            success: true,
            data: enrichedCoupons,
            pagination: {
                current_page: pageNum,
                total_pages: Math.ceil(total / limitNum),
                total_items: total,
                items_per_page: limitNum
            }
        });

    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single coupon by ID
// @route   GET /api/coupons/:id
// @access  Private/Admin
exports.getCouponById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coupon ID'
            });
        }

        const coupon = await Coupon.findById(id)
            .populate('createdBy', 'username email')
            .populate('updatedBy', 'username email');

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                ...coupon.toObject(),
                isExpired: coupon.isExpired,
                isValid: coupon.isValid,
                remainingUses: coupon.remainingUses
            }
        });

    } catch (error) {
        console.error('Error fetching coupon:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private/Admin
exports.updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const image = req.file?.path;

        // Find coupon
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        // Build update data
        const updateData = { ...req.body, updatedBy: req.user?.id };

        // Handle image update
        if (image) {
            updateData.image = image;
        }

        // Handle special fields
        if (updateData.couponCode) {
            updateData.couponCode = updateData.couponCode.toUpperCase();
            
            // Check if new coupon code already exists (excluding current coupon)
            const existingCoupon = await Coupon.findOne({
                couponCode: updateData.couponCode,
                _id: { $ne: id }
            });
            
            if (existingCoupon) {
                return res.status(400).json({
                    success: false,
                    message: 'Coupon code already exists'
                });
            }
        }

        // Parse numeric fields
        ['couponValue', 'minOrderAmount', 'maxDiscountAmount', 'totalUsageLimit', 'perUserUsageLimit'].forEach(field => {
            if (updateData[field] !== undefined) {
                updateData[field] = updateData[field] === '' ? null : Number(updateData[field]);
            }
        });

        // Parse boolean fields
        if (updateData.status !== undefined) {
            updateData.status = updateData.status === 'true' || updateData.status === true;
        }

        // Parse dates
        if (updateData.expiryDate) {
            updateData.expiryDate = new Date(updateData.expiryDate);
        }
        if (updateData.startDate) {
            updateData.startDate = new Date(updateData.startDate);
        }

        // Update coupon
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Coupon updated successfully',
            data: updatedCoupon
        });

    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
exports.deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;

        const coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        // Optional: Check if coupon has been used
        if (coupon.totalUsedCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete coupon that has been used. Consider deactivating it instead.'
            });
        }

        await coupon.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Coupon deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Toggle coupon status
// @route   PATCH /api/coupons/:id/status
// @access  Private/Admin
exports.toggleCouponStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (typeof status !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Status must be a boolean'
            });
        }

        const coupon = await Coupon.findByIdAndUpdate(
            id,
            { 
                status,
                updatedBy: req.user?.id 
            },
            { new: true }
        );

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.status(200).json({
            success: true,
            message: `Coupon ${status ? 'activated' : 'deactivated'} successfully`,
            data: coupon
        });

    } catch (error) {
        console.error('Error toggling coupon status:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ==================== PUBLIC/USER CONTROLLERS ====================

// @desc    Validate coupon (for checkout)
// @route   POST /api/coupons/validate
// @access  Private (User)
exports.validateCoupon = async (req, res) => {
    try {
        const { couponCode, orderAmount, userId } = req.body;

        if (!couponCode || !orderAmount) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code and order amount are required'
            });
        }

        // Find coupon
        const coupon = await Coupon.findOne({ 
            couponCode: couponCode.toUpperCase() 
        });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Invalid coupon code'
            });
        }

        // Check if coupon is active
        if (!coupon.status) {
            return res.status(400).json({
                success: false,
                message: 'This coupon is currently inactive'
            });
        }

        // Check expiry
        if (coupon.expiryDate < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'This coupon has expired'
            });
        }

        // Check start date
        if (coupon.startDate > new Date()) {
            return res.status(400).json({
                success: false,
                message: 'This coupon is not yet active'
            });
        }

        // Check minimum order amount
        if (orderAmount < coupon.minOrderAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum order amount of ${coupon.minOrderAmount} is required`
            });
        }

        // Check total usage limit
        if (coupon.totalUsageLimit && coupon.totalUsedCount >= coupon.totalUsageLimit) {
            return res.status(400).json({
                success: false,
                message: 'This coupon has reached its maximum usage limit'
            });
        }

        // If userId is provided, check user-specific limits
        if (userId) {
            // Check if user exists
            const user = await User.findById(userId);
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user'
                });
            }

            // Check user type eligibility (simplified - you may want more complex logic)
            if (coupon.userType === 'new') {
                const orderCount = await Order.countDocuments({ user_id: userId });
                if (orderCount > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'This coupon is only for new users'
                    });
                }
            }

            if (coupon.userType === 'existing') {
                const orderCount = await Order.countDocuments({ user_id: userId });
                if (orderCount === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'This coupon is only for existing users'
                    });
                }
            }

            // Check per-user usage limit (you'd need to track this in a separate collection)
            // This is a placeholder - implement with CouponUsage model
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (orderAmount * coupon.couponValue) / 100;
            if (coupon.maxDiscountAmount) {
                discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
            }
        } else {
            discountAmount = Math.min(coupon.couponValue, orderAmount);
        }

        res.status(200).json({
            success: true,
            message: 'Coupon is valid',
            data: {
                coupon,
                discountAmount,
                finalAmount: orderAmount - discountAmount
            }
        });

    } catch (error) {
        console.error('Error validating coupon:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get active coupons for user
// @route   GET /api/coupons/active
// @access  Private (User)
exports.getActiveCoupons = async (req, res) => {
    try {
        const { userId, orderAmount } = req.query;
        const now = new Date();

        // Find all active and valid coupons
        const coupons = await Coupon.find({
            status: true,
            startDate: { $lte: now },
            expiryDate: { $gte: now },
            $or: [
                { totalUsageLimit: null },
                { totalUsedCount: { $lt: '$totalUsageLimit' } }
            ]
        }).lean();

        // Filter coupons based on user and order amount
        const validCoupons = await Promise.all(coupons.map(async (coupon) => {
            // Check minimum order amount
            if (orderAmount && orderAmount < coupon.minOrderAmount) {
                return null;
            }

            // Check user type if userId provided
            if (userId) {
                if (coupon.userType === 'new') {
                    const orderCount = await Order.countDocuments({ user_id: userId });
                    if (orderCount > 0) return null;
                }
                if (coupon.userType === 'existing') {
                    const orderCount = await Order.countDocuments({ user_id: userId });
                    if (orderCount === 0) return null;
                }
            }

            return {
                ...coupon,
                discountDescription: coupon.discountType === 'percentage' 
                    ? `${coupon.couponValue}% off${coupon.maxDiscountAmount ? ` (up to ₹${coupon.maxDiscountAmount})` : ''}`
                    : `₹${coupon.couponValue} off`
            };
        }));

        // Remove null values
        const filteredCoupons = validCoupons.filter(c => c !== null);

        res.status(200).json({
            success: true,
            data: filteredCoupons
        });

    } catch (error) {
        console.error('Error fetching active coupons:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ==================== COUPON STATISTICS ====================

// @desc    Get coupon statistics
// @route   GET /api/coupons/stats
// @access  Private/Admin
exports.getCouponStats = async (req, res) => {
    try {
        const stats = await Coupon.aggregate([
            {
                $facet: {
                    // Overall stats
                    overall: [
                        {
                            $group: {
                                _id: null,
                                totalCoupons: { $sum: 1 },
                                activeCoupons: {
                                    $sum: { $cond: ['$status', 1, 0] }
                                },
                                inactiveCoupons: {
                                    $sum: { $cond: ['$status', 0, 1] }
                                },
                                totalUsedCount: { $sum: '$totalUsedCount' },
                                averageValue: { $avg: '$couponValue' }
                            }
                        }
                    ],
                    // Stats by type
                    byType: [
                        {
                            $group: {
                                _id: '$couponType',
                                count: { $sum: 1 },
                                activeCount: {
                                    $sum: { $cond: ['$status', 1, 0] }
                                }
                            }
                        }
                    ],
                    // Expiring soon (next 7 days)
                    expiringSoon: [
                        {
                            $match: {
                                expiryDate: {
                                    $gte: new Date(),
                                    $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                },
                                status: true
                            }
                        },
                        {
                            $count: 'count'
                        }
                    ],
                    // Expired coupons
                    expired: [
                        {
                            $match: {
                                expiryDate: { $lt: new Date() }
                            }
                        },
                        {
                            $count: 'count'
                        }
                    ]
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: stats[0]
        });

    } catch (error) {
        console.error('Error fetching coupon stats:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



// Bulk delete coupons
// router.post('/bulk-delete', protect, authorize('admin'), async (req, res) => {
exports.BulkCoupondelete = async (req, res) => {
    try {
        const { couponIds } = req.body;

        if (!Array.isArray(couponIds) || couponIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of coupon IDs'
            });
        }

        // Check if any coupons have been used
        const usedCoupons = await Coupon.find({
            _id: { $in: couponIds },
            totalUsedCount: { $gt: 0 }
        });

        if (usedCoupons.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete coupons that have been used',
                usedCoupons: usedCoupons.map(c => c.couponCode)
            });
        }

        const result = await Coupon.deleteMany({
            _id: { $in: couponIds }
        });

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} coupons deleted successfully`
        });

    } catch (error) {
        console.error('Error bulk deleting coupons:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Bulk update coupon status
// router.patch('/bulk-status', protect, authorize('admin'), async (req, res) => {
exports.BulkCouponStatus = async (req, res) => {
    try {
        const { couponIds, status } = req.body;

        if (!Array.isArray(couponIds) || couponIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of coupon IDs'
            });
        }

        if (typeof status !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Status must be a boolean'
            });
        }

        const result = await Coupon.updateMany(
            { _id: { $in: couponIds } },
            { status }
        );

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} coupons updated successfully`
        });

    } catch (error) {
        console.error('Error bulk updating coupons:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// controllers/couponController.js
exports.validateCouponForCart = async (req, res) => {
    try {
        const { couponCode, cartTotal } = req.body;
        const userId = req.user._id;

        if (!couponCode || !cartTotal) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code and cart total are required'
            });
        }

        const result = await CouponService.validateAndApplyCoupon(
            couponCode,
            userId,
            cartTotal
        );

        res.status(200).json({
            success: true,
            message: 'Coupon is valid',
            data: {
                couponCode: result.coupon.couponCode,
                discountAmount: result.discountAmount,
                finalAmount: result.finalAmount,
                discountType: result.coupon.discountType,
                couponValue: result.coupon.couponValue,
                maxDiscountAmount: result.coupon.maxDiscountAmount,
                minOrderAmount: result.coupon.minOrderAmount
            }
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


