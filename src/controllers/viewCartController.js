const mongoose = require('mongoose');
const Cart = require('../models/cart');
const Product = require('../models/products');
const User = require('../models/User');
const { PRODUCT_TYPES, STOCK_STATUS } = require('../types/productTypes');



/**
 * Get user's cart with product details
 */
const getCart = async (req, res) => {
    try {
        const userId = req.user._id;

        // Get cart and populate product details
        const cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.product',
                select: 'name price productType status isApproved isDeleted images variants simpleProduct vendorId',
                populate: {
                    path: 'vendorId',
                    select: 'name email businessName'
                }
            })
            .lean();

        if (!cart) {
            return res.status(200).json({
                success: true,
                message: 'Cart is empty',
                data: {
                    items: [],
                    summary: {
                        totalItems: 0,
                        totalPrice: 0,
                        totalDiscount: 0,
                        deliveryCharge: 0,
                        finalTotal: 0
                    }
                }
            });
        }

        // Process items with detailed information
        const processedItems = await Promise.all(cart.items.map(async (item) => {
            const product = item.product;

            if (!product || product.isDeleted || !product.isApproved || !product.status) {
                return {
                    ...item,
                    product: null,
                    available: false,
                    message: 'Product not available'
                };
            }

            let price = 0;
            let variant = null;
            let stockInfo = null;
            let maxQty = 0;
            let available = true;
            let message = '';

            if (product.productType === PRODUCT_TYPES.SIMPLE) {
                price = product.simpleProduct.sp_specialPrice || product.simpleProduct.sp_price;
                maxQty = product.simpleProduct.sp_totalStock;

                if (product.simpleProduct.sp_stockStatus !== STOCK_STATUS.IN_STOCK) {
                    available = false;
                    message = 'Out of stock';
                } else if (maxQty < item.qty) {
                    available = false;
                    message = `Only ${maxQty} items available`;
                }
            }
            else if (product.productType === PRODUCT_TYPES.VARIABLE) {
                if (!item.variantId) {
                    available = false;
                    message = 'Variant not selected';
                } else {
                    variant = product.variants.id(item.variantId);
                    if (!variant || !variant.variant_isActive) {
                        available = false;
                        message = 'Variant not available';
                    } else {
                        price = variant.variant_specialPrice || variant.variant_price;
                        maxQty = variant.variant_totalStock;

                        if (variant.variant_stockStatus !== STOCK_STATUS.IN_STOCK) {
                            available = false;
                            message = 'Variant out of stock';
                        } else if (maxQty < item.qty) {
                            available = false;
                            message = `Only ${maxQty} items available for this variant`;
                        }
                    }
                }
            }

            const itemTotal = price * item.qty;

            return {
                _id: item._id,
                product: {
                    _id: product._id,
                    name: product.name,
                    images: product.images,
                    productType: product.productType,
                    vendor: product.vendorId
                },
                variant: variant ? {
                    _id: variant._id,
                    variant_name: variant.variant_name,
                    variant_sku: variant.variant_sku,
                    attributes: variant.variant_attributes
                } : null,
                qty: item.qty,
                price,
                itemTotal,
                available,
                maxQty,
                message,
                inStock: available
            };
        }));

        // Filter out unavailable items (optional)
        const availableItems = processedItems.filter(item => item.available);

        // Calculate cart summary
        const summary = this.calculateCartSummary(availableItems);

        // Update cart if there are unavailable items
        if (availableItems.length !== cart.items.length) {
            // Remove unavailable items from cart
            const updatedItems = cart.items.filter((item, index) => {
                return processedItems[index].available;
            });

            await Cart.findOneAndUpdate(
                { userId },
                { items: updatedItems },
                { new: true }
            );
        }

        res.status(200).json({
            success: true,
            message: 'Cart retrieved successfully',
            data: {
                items: availableItems,
                summary,
                unavailableItems: processedItems.filter(item => !item.available)
            }
        });

    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve cart',
            error: error.message
        });
    }
}

/**
 * Add item to cart
 */
const addToCart = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;
        const { productId, variantId, qty = 1 } = req.body;

        // Validate input
        if (!productId) {
            throw new Error('Product ID is required');
        }

        if (qty < 1) {
            throw new Error('Quantity must be at least 1');
        }

        // Get product with details
        const product = await Product.findById(productId).session(session);
        if (!product) {
            throw new Error('Product not found');
        }

        // Check product availability
        if (product.isDeleted || !product.isApproved || !product.status) {
            throw new Error('Product is not available');
        }

        let price = 0;
        let availableQty = 0;
        let variant = null;

        if (product.productType === PRODUCT_TYPES.VARIABLE) {
            if (!variantId) {
                throw new Error('Variant ID is required for variable product');
            }

            variant = product.variants.id(variantId);
            if (!variant || !variant.variant_isActive) {
                throw new Error('Variant not available');
            }

            if (variant.variant_stockStatus !== STOCK_STATUS.IN_STOCK) {
                throw new Error('Variant is out of stock');
            }

            price = variant.variant_specialPrice || variant.variant_price;
            availableQty = variant.variant_totalStock;

            if (availableQty < qty) {
                throw new Error(`Only ${availableQty} items available for this variant`);
            }
        }
        else if (product.productType === PRODUCT_TYPES.SIMPLE) {
            if (variantId) {
                throw new Error('Variant ID should not be provided for simple product');
            }

            if (product.simpleProduct.sp_stockStatus !== STOCK_STATUS.IN_STOCK) {
                throw new Error('Product is out of stock');
            }

            price = product.simpleProduct.sp_specialPrice || product.simpleProduct.sp_price;
            availableQty = product.simpleProduct.sp_totalStock;

            if (availableQty < qty) {
                throw new Error(`Only ${availableQty} items available`);
            }
        }
        else {
            throw new Error('Invalid product type');
        }

        // Find existing cart or create new
        let cart = await Cart.findOne({ userId }).session(session);

        if (!cart) {
            cart = new Cart({
                userId,
                items: []
            });
        }

        // Check if item already exists in cart
        const existingItemIndex = cart.items.findIndex(item => {
            if (product.productType === PRODUCT_TYPES.VARIABLE) {
                return item.product.equals(productId) && item.variantId?.equals(variantId);
            }
            return item.product.equals(productId) && !item.variantId;
        });

        if (existingItemIndex > -1) {
            // Update existing item quantity
            const newQty = cart.items[existingItemIndex].qty + qty;

            if (newQty > availableQty) {
                throw new Error(`Cannot add ${qty} more items. Only ${availableQty - cart.items[existingItemIndex].qty} available.`);
            }

            cart.items[existingItemIndex].qty = newQty;
        } else {
            // Add new item
            const newItem = {
                product: productId,
                qty: qty
            };

            if (variantId) {
                newItem.variantId = variantId;
            }

            cart.items.push(newItem);
        }

        await cart.save({ session });
        await session.commitTransaction();

        // Get updated cart with populated data
        const updatedCart = await Cart.findOne({ userId })
            .populate({
                path: 'items.product',
                select: 'name images productType'
            });

        res.status(200).json({
            success: true,
            message: existingItemIndex > -1 ? 'Cart item updated' : 'Item added to cart',
            data: {
                cart: updatedCart,
                item: {
                    productId,
                    variantId,
                    qty: existingItemIndex > -1 ? cart.items[existingItemIndex].qty : qty,
                    price,
                    itemTotal: price * (existingItemIndex > -1 ? cart.items[existingItemIndex].qty : qty)
                }
            }
        });

    } catch (error) {
        console.error('Add to cart error:', error);
        await session.abortTransaction();
        res.status(400).json({
            success: false,
            message: 'Failed to add item to cart',
            error: error.message
        });
    } finally {
        session.endSession();
    }
}

/**
 * Update cart item quantity
 */
const updateCartItem = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;
        const { itemId } = req.params;
        const { qty } = req.body;

        if (!qty || qty < 1) {
            throw new Error('Quantity must be at least 1');
        }

        // Find cart
        const cart = await Cart.findOne({ userId }).session(session);
        if (!cart) {
            throw new Error('Cart not found');
        }

        // Find item index
        const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
        if (itemIndex === -1) {
            throw new Error('Item not found in cart');
        }

        const item = cart.items[itemIndex];

        // Get product details for stock validation
        const product = await Product.findById(item.product).session(session);
        if (!product) {
            throw new Error('Product not found');
        }

        let availableQty = 0;

        if (product.productType === PRODUCT_TYPES.VARIABLE && item.variantId) {
            const variant = product.variants.id(item.variantId);
            if (!variant) {
                throw new Error('Variant not found');
            }
            availableQty = variant.variant_totalStock;
        }
        else if (product.productType === PRODUCT_TYPES.SIMPLE) {
            availableQty = product.simpleProduct.sp_totalStock;
        }

        if (availableQty < qty) {
            throw new Error(`Only ${availableQty} items available`);
        }

        // Update quantity
        cart.items[itemIndex].qty = qty;
        await cart.save({ session });
        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Cart item updated',
            data: {
                itemId,
                qty,
                updatedAt: new Date()
            }
        });

    } catch (error) {
        console.error('Update cart item error:', error);
        await session.abortTransaction();
        res.status(400).json({
            success: false,
            message: 'Failed to update cart item',
            error: error.message
        });
    } finally {
        session.endSession();
    }
}

/**
 * Remove item from cart
 */
const removeFromCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const { itemId } = req.params;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const initialLength = cart.items.length;
        cart.items = cart.items.filter(item => item._id.toString() !== itemId);

        if (cart.items.length === initialLength) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        await cart.save();

        res.status(200).json({
            success: true,
            message: 'Item removed from cart',
            data: {
                itemId,
                remainingItems: cart.items.length
            }
        });

    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove item from cart',
            error: error.message
        });
    }
}

/**
 * Clear entire cart
 */
const clearCart = async (req, res) => {
    try {
        const userId = req.user._id;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(200).json({
                success: true,
                message: 'Cart is already empty'
            });
        }

        cart.items = [];
        await cart.save();

        res.status(200).json({
            success: true,
            message: 'Cart cleared successfully'
        });

    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear cart',
            error: error.message
        });
    }
}

/**
 * Get cart summary/overview
 */
const getCartSummary = async (req, res) => {
    try {
        const userId = req.user._id;

        const cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.product',
                select: 'name price productType simpleProduct variants'
            });

        if (!cart || cart.items.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Cart is empty',
                data: {
                    totalItems: 0,
                    totalPrice: 0,
                    estimatedDelivery: 'N/A',
                    itemsCount: 0
                }
            });
        }

        let totalItems = 0;
        let totalPrice = 0;

        for (const item of cart.items) {
            const product = item.product;
            let price = 0;

            if (product.productType === PRODUCT_TYPES.VARIABLE && item.variantId) {
                const variant = product.variants.id(item.variantId);
                if (variant) {
                    price = variant.variant_specialPrice || variant.variant_price;
                }
            }
            else if (product.productType === PRODUCT_TYPES.SIMPLE) {
                price = product.simpleProduct.sp_specialPrice || product.simpleProduct.sp_price;
            }

            totalItems += item.qty;
            totalPrice += price * item.qty;
        }

        res.status(200).json({
            success: true,
            message: 'Cart summary retrieved',
            data: {
                totalItems,
                totalPrice,
                itemsCount: cart.items.length,
                estimatedDelivery: '3-5 business days'
            }
        });

    } catch (error) {
        console.error('Get cart summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get cart summary',
            error: error.message
        });
    }
}

/**
 * Move cart items to wishlist (optional)
 */
const moveToWishlist = async (req, res) => {
    try {
        const userId = req.user._id;
        const { itemIds } = req.body; // Array of item IDs to move

        const cart = await Cart.findOne({ userId });
        if (!cart || cart.items.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        // Filter items to move and keep
        const itemsToMove = [];
        const itemsToKeep = [];

        cart.items.forEach(item => {
            if (itemIds.includes(item._id.toString())) {
                itemsToMove.push(item);
            } else {
                itemsToKeep.push(item);
            }
        });

        if (itemsToMove.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No items selected to move'
            });
        }

        // TODO: Implement wishlist logic here
        // Example: await Wishlist.addItems(userId, itemsToMove);

        // Update cart with remaining items
        cart.items = itemsToKeep;
        await cart.save();

        res.status(200).json({
            success: true,
            message: `${itemsToMove.length} items moved to wishlist`,
            data: {
                movedItems: itemsToMove.length,
                remainingItems: itemsToKeep.length
            }
        });

    } catch (error) {
        console.error('Move to wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to move items to wishlist',
            error: error.message
        });
    }
}

/**
 * Helper: Calculate cart summary
 */
const calculateCartSummary = (items) => {
    const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.itemTotal, 0);
    const totalDiscount = 0; // Implement discount logic if needed
    const deliveryCharge = totalPrice > 500 ? 0 : 50; // Example logic
    const finalTotal = totalPrice + deliveryCharge - totalDiscount;

    return {
        totalItems,
        totalPrice,
        totalDiscount,
        deliveryCharge,
        finalTotal,
        itemsCount: items.length
    };
}

/**
 * Merge guest cart with user cart (for login scenarios)
 */
const mergeCarts = async (req, res) => {
    try {
        const userId = req.user._id;
        const { guestCart } = req.body; // Guest cart items from localStorage

        if (!guestCart || !Array.isArray(guestCart) || guestCart.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No guest cart items to merge'
            });
        }

        let userCart = await Cart.findOne({ userId });

        if (!userCart) {
            userCart = new Cart({
                userId,
                items: []
            });
        }

        let mergedCount = 0;
        let skippedCount = 0;

        for (const guestItem of guestCart) {
            try {
                // Validate product exists
                const product = await Product.findById(guestItem.productId);
                if (!product || product.isDeleted || !product.isApproved || !product.status) {
                    skippedCount++;
                    continue;
                }

                // Check if item already exists in user cart
                const existingItemIndex = userCart.items.findIndex(item => {
                    if (product.productType === PRODUCT_TYPES.VARIABLE) {
                        return item.product.equals(guestItem.productId) &&
                            item.variantId?.equals(guestItem.variantId);
                    }
                    return item.product.equals(guestItem.productId) && !item.variantId;
                });

                if (existingItemIndex > -1) {
                    // Update quantity
                    userCart.items[existingItemIndex].qty += guestItem.qty || 1;
                } else {
                    // Add new item
                    userCart.items.push({
                        product: guestItem.productId,
                        variantId: guestItem.variantId,
                        qty: guestItem.qty || 1
                    });
                }
                mergedCount++;
            } catch (error) {
                console.error('Error merging item:', error);
                skippedCount++;
            }
        }

        await userCart.save();

        res.status(200).json({
            success: true,
            message: 'Carts merged successfully',
            data: {
                mergedCount,
                skippedCount,
                totalItems: userCart.items.length
            }
        });

    } catch (error) {
        console.error('Merge carts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to merge carts',
            error: error.message
        });
    }
}

/**
 * Get cart count (for cart icon badge)
 */
const getCartCount = async (req, res) => {
    try {
        const userId = req.user._id;

        const cart = await Cart.findOne({ userId });
        const count = cart ? cart.items.reduce((sum, item) => sum + item.qty, 0) : 0;

        res.status(200).json({
            success: true,
            data: {
                count,
                itemsCount: cart ? cart.items.length : 0
            }
        });

    } catch (error) {
        console.error('Get cart count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get cart count',
            error: error.message
        });
    }
}


module.exports = {
    getCartCount,
    calculateCartSummary,
    moveToWishlist,
    getCartSummary,
    clearCart,
    removeFromCart,
    updateCartItem,
    addToCart,
    mergeCarts,
    getCart


}