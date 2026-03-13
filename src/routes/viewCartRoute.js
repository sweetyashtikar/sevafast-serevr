const express = require('express');
const router = express.Router();
const cartController = require('../controllers/viewCartController');
const {authenticate} = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// Get user's cart
router.get('/', cartController.getCart);//done

// Get cart summary
router.get('/summary', cartController.getCartSummary);//done

// Get cart count
router.get('/count', cartController.getCartCount);//done

// Add item to cart
router.post('/addtoCart', cartController.addToCart);//done

// Update cart item quantity
router.put('/item/:itemId', cartController.updateCartItem);//done

// Remove item from cart
router.delete('/item/:itemId', cartController.removeFromCart);

// Clear entire cart
router.delete('/clear', cartController.clearCart);

// Move items to wishlist
router.post('/move-to-wishlist', cartController.moveToWishlist);

// Merge guest cart with user cart
router.post('/merge', cartController.mergeCarts);

module.exports = router;