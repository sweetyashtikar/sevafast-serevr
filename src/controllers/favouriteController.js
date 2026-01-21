const Favorite = require('../models/favourite');
const mongoose = require('mongoose');

// Add product to favorites
const addToFavorites = async (req, res) => {
    try {
        const { user_id, product_id } = req.body;
        
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(user_id) || !mongoose.Types.ObjectId.isValid(product_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user_id or product_id format'
            });
        }
        
        // Check if already favorited
        const existingFavorite = await Favorite.findOne({ user_id, product_id });
        if (existingFavorite) {
            return res.status(409).json({
                success: false,
                message: 'Product already in favorites'
            });
        }
        
        const newFavorite = new Favorite({
            user_id,
            product_id
        });
        
        const savedFavorite = await newFavorite.save();
        
        // Populate product details
        const populatedFavorite = await Favorite.findById(savedFavorite._id)
            .populate('product_id', 'name price images')
            .populate('user_id', 'name email');
        
        res.status(201).json({
            success: true,
            message: 'Product added to favorites successfully',
            data: populatedFavorite
        });
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error
            return res.status(409).json({
                success: false,
                message: 'Product already in favorites'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error adding to favorites',
            error: error.message
        });
    }
};

// Remove product from favorites
const removeFromFavorites = async (req, res) => {
    try {
        const { user_id, product_id } = req.body;
        
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(user_id) || !mongoose.Types.ObjectId.isValid(product_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user_id or product_id format'
            });
        }
        
        const deletedFavorite = await Favorite.findOneAndDelete({ user_id, product_id });
        
        if (!deletedFavorite) {
            return res.status(404).json({
                success: false,
                message: 'Favorite not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Product removed from favorites successfully',
            data: deletedFavorite
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error removing from favorites',
            error: error.message
        });
    }
};

// Get user's favorites with pagination
const getUserFavorites = async (req, res) => {
    try {
        const { user_id } = req.params;
        const { page = 1, limit = 20 } = req.query;
        
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user_id format'
            });
        }
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        const [favorites, total] = await Promise.all([
            Favorite.find({ user_id })
                .populate({
                    path: 'product_id',
                    select: 'name price images stock category',
                    populate: {
                        path: 'category',
                        select: 'name'
                    }
                })
                .sort({ date_added: -1 })
                .skip(skip)
                .limit(limitNum),
            Favorite.countDocuments({ user_id })
        ]);
        
        res.status(200).json({
            success: true,
            message: 'Favorites retrieved successfully',
            data: favorites,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving favorites',
            error: error.message
        });
    }
};

// Check if product is in user's favorites
const checkFavoriteStatus = async (req, res) => {
    try {
        const { user_id, product_id } = req.query;
        
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(user_id) || !mongoose.Types.ObjectId.isValid(product_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user_id or product_id format'
            });
        }
        
        const favorite = await Favorite.findOne({ user_id, product_id });
        
        res.status(200).json({
            success: true,
            message: 'Favorite status retrieved',
            data: {
                is_favorited: !!favorite,
                favorite_id: favorite ? favorite._id : null,
                date_added: favorite ? favorite.date_added : null
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error checking favorite status',
            error: error.message
        });
    }
};

// Remove favorite by ID
const removeFavoriteById = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid favorite ID'
            });
        }
        
        const deletedFavorite = await Favorite.findByIdAndDelete(id);
        
        if (!deletedFavorite) {
            return res.status(404).json({
                success: false,
                message: 'Favorite not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Favorite removed successfully',
            data: deletedFavorite
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error removing favorite',
            error: error.message
        });
    }
};

// Get favorite by ID with details
const getFavoriteById = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid favorite ID'
            });
        }
        
        const favorite = await Favorite.findById(id)
            .populate('user_id', 'name email')
            .populate({
                path: 'product_id',
                select: 'name description price images category brand',
                populate: [
                    { path: 'category', select: 'name' },
                    { path: 'brand', select: 'name' }
                ]
            });
        
        if (!favorite) {
            return res.status(404).json({
                success: false,
                message: 'Favorite not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Favorite retrieved successfully',
            data: favorite
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving favorite',
            error: error.message
        });
    }
};

// Get multiple users' favorite products (admin use)
const getFavoritesByUsers = async (req, res) => {
    try {
        const { user_ids } = req.body; // Array of user IDs
        
        if (!Array.isArray(user_ids) || user_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'user_ids must be a non-empty array'
            });
        }
        
        // Validate all ObjectIds
        const invalidIds = user_ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
        if (invalidIds.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user_id(s) in array',
                invalid_ids: invalidIds
            });
        }
        
        const favorites = await Favorite.find({ user_id: { $in: user_ids } })
            .populate('user_id', 'name email')
            .populate('product_id', 'name price')
            .sort({ date_added: -1 });
        
        // Group by user for better structure
        const groupedFavorites = favorites.reduce((acc, favorite) => {
            const userId = favorite.user_id._id.toString();
            if (!acc[userId]) {
                acc[userId] = {
                    user: favorite.user_id,
                    favorites: []
                };
            }
            acc[userId].favorites.push(favorite);
            return acc;
        }, {});
        
        res.status(200).json({
            success: true,
            message: 'Favorites retrieved successfully',
            data: Object.values(groupedFavorites)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving favorites',
            error: error.message
        });
    }
};

// Get count of user's favorites
const getFavoriteCount = async (req, res) => {
    try {
        const { user_id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user_id format'
            });
        }
        
        const count = await Favorite.countDocuments({ user_id });
        
        res.status(200).json({
            success: true,
            message: 'Favorite count retrieved',
            data: { user_id, count }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting favorite count',
            error: error.message
        });
    }
};

// Clear all favorites for a user
const clearUserFavorites = async (req, res) => {
    try {
        const { user_id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user_id format'
            });
        }
        
        const result = await Favorite.deleteMany({ user_id });
        
        res.status(200).json({
            success: true,
            message: `Cleared ${result.deletedCount} favorites for user`,
            data: { deleted_count: result.deletedCount }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error clearing favorites',
            error: error.message
        });
    }
};

module.exports = {
    addToFavorites,
    removeFromFavorites,
    getUserFavorites,
    checkFavoriteStatus,
    removeFavoriteById,
    getFavoriteById,
    getFavoritesByUsers,
    getFavoriteCount,
    clearUserFavorites
};