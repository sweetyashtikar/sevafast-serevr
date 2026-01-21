const express = require('express');
const router = express.Router();
const {
    addToFavorites,
    removeFromFavorites,
    getUserFavorites,
    checkFavoriteStatus,
    removeFavoriteById,
    getFavoriteById,
    getFavoritesByUsers,
    getFavoriteCount,
    clearUserFavorites
} = require('../controllers/favouriteController');

// Add product to favorites
router.post('/add', addToFavorites);

// Remove product from favorites
router.post('/remove', removeFromFavorites);

// Get user's favorites with pagination
router.get('/user/:user_id', getUserFavorites);

// Check if product is in user's favorites
router.get('/check', checkFavoriteStatus);

// Remove favorite by ID
router.delete('/:id', removeFavoriteById);

// Get favorite by ID
router.get('/:id', getFavoriteById);

// Get favorites for multiple users (admin)
router.post('/users', getFavoritesByUsers);

// Get count of user's favorites
router.get('/count/:user_id', getFavoriteCount);

// Clear all favorites for a user
router.delete('/user/:user_id/clear', clearUserFavorites);

module.exports = router;