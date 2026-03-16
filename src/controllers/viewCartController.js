const mongoose = require('mongoose');
const Cart = require('../models/cart');
const Product = require('../models/products');
const User = require('../models/User');
const UserSubscription = require('../models/userSubscription');
const Subscription = require('../models/subscription');
const Address = require('../models/address');
const { PRODUCT_TYPES, STOCK_STATUS } = require('../types/productTypes');



/**
 * Get user's cart with product details
 */
// const getCart = async (req, res) => {
//     try {
//         const userId = req.user._id;

//         // Get cart and populate product details
//         const cart = await Cart.findOne({ userId })
//             .populate({
//                 path: 'items.product',
//                 select: 'name price productType status isApproved isDeleted mainImage otherImages variants simpleProduct vendorId',
//                 populate: {
//                     path: 'vendorId',
//                     select: 'name email businessName'
//                 }
//             })

//         if (!cart) {
//             return res.status(200).json({
//                 success: true,
//                 message: 'Cart is empty',
//                 data: {
//                     items: [],
//                     summary: {
//                         totalItems: 0,
//                         totalPrice: 0,
//                         totalDiscount: 0,
//                         deliveryCharge: 0,
//                         finalTotal: 0
//                     }
//                 }
//             });
//         }

//         // Process items with detailed information
//         const processedItems = await Promise.all(cart.items.map(async (item) => {
//             const product = item.product;

//             if (!product || product.isDeleted || !product.isApproved || !product.status) {
//                 return {
//                     ...item,
//                     product: null,
//                     available: false,
//                     message: 'Product not available'
//                 };
//             }

//             let price = 0;
//             let variant = null;
//             let stockInfo = null;
//             let maxQty = 0;
//             let available = true;
//             let message = '';

//             if (product.productType === PRODUCT_TYPES.SIMPLE) {
//                 price = product.simpleProduct.sp_specialPrice || product.simpleProduct.sp_price;
//                 maxQty = product.simpleProduct.sp_totalStock;

//                 if (product.simpleProduct.sp_stockStatus !== STOCK_STATUS.IN_STOCK) {
//                     available = false;
//                     message = 'Out of stock';
//                 } else if (maxQty < item.qty) {
//                     available = false;
//                     message = `Only ${maxQty} items available`;
//                 }
//             }
//             else if (product.productType === PRODUCT_TYPES.VARIABLE) {
//                 if (!item.variantId) {
//                     available = false;
//                     message = 'Variant not selected';
//                 } else {
//                     variant = product.variants.id(item.variantId);
//                     if (!variant || !variant.variant_isActive) {
//                         available = false;
//                         message = 'Variant not available';
//                     } else {
//                         price = variant.variant_specialPrice || variant.variant_price;
//                         maxQty = variant.variant_totalStock;

//                         if (variant.variant_stockStatus !== STOCK_STATUS.IN_STOCK) {
//                             available = false;
//                             message = 'Variant out of stock';
//                         } else if (maxQty < item.qty) {
//                             available = false;
//                             message = `Only ${maxQty} items available for this variant`;
//                         }
//                     }
//                 }
//             }

//             const itemTotal = price * item.qty;

//             return {
//                 _id: item._id,
//                 product: {
//                     _id: product._id,
//                     name: product.name,
//                     mainImages: product.mainImage,
//                     productType: product.productType,
//                     vendor: product.vendorId
//                 },
//                 variant: variant ? {
//                     _id: variant._id,
//                       variant_price: variant.variant_price,
//                     variant_specialPrice: variant.variant_specialPrice,
//                     variant_isActive: variant.variant_isActive,
//                     variant_stockStatus: variant.variant_stockStatus,
//                      variant_images: variant.variant_images || [],
//                       variant_dimensions: {
//                     variant_weight: variant.variant_weight,
//                     height: variant.variant_height,
//                     breadth: variant.variant_breadth,
//                     length: variant.variant_length
//                 },
//                     variant_name: variant.variant_name,
//                     variant_sku: variant.variant_sku,
//                     attributes: variant.variant_attributes
//                 } : null,
//                 qty: item.qty,
//                 price,
//                 itemTotal,
//                 available,
//                 maxQty,
//                 message,
//                 inStock: available
//             };
//         }));

//         // Filter out unavailable items (optional)
//         const availableItems = processedItems.filter(item => item.available);

//         // Calculate cart summary
//         const summary = calculateCartSummary(availableItems);

//         // Update cart if there are unavailable items
//         if (availableItems.length !== cart.items.length) {
//             // Remove unavailable items from cart
//             const updatedItems = cart.items.filter((item, index) => {
//                 return processedItems[index].available;
//             });

//             await Cart.findOneAndUpdate(
//                 { userId },
//                 { items: updatedItems },
//                 { new: true }
//             );
//         }

//         res.status(200).json({
//             success: true,
//             message: 'Cart retrieved successfully',
//             data: {
//                 items: availableItems,
//                 summary,
//                 unavailableItems: processedItems.filter(item => !item.available)
//             }
//         });

//     } catch (error) {
//         console.error('Get cart error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to retrieve cart',
//             error: error.message
//         });
//     }
// }

// controllers/cartController.js
const getCart = async (req, res) => {
    try {
        const userId = req.user._id;

        // Get cart and populate product details with vendor info
        const cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.product',
                select: 'name productType status isApproved isDeleted mainImage otherImages simpleProduct variants vendorId productLevelStock',
                populate: {
                    path: 'vendorId',
                    select: 'name email businessName'
                }
            });

        if (!cart) {
            return res.status(200).json({
                success: true,
                message: 'Cart is empty',
                data: {
                    items: [],
                    summary: {
                        totalItems: 0,
                        totalAmount: 0,
                        totalDiscount: 0,
                        deliveryCharge: 0,
                        finalTotal: 0,
                        itemCount: 0
                    },
                    unavailableItems: []
                }
            });
        }

        // Process items with detailed information and price calculation
        const processedItems = await Promise.all(cart.items.map(async (item) => {
            const product = item.product;
            let price = 0;
            let variant = null;
            let stockInfo = null;
            let maxQty = 0;
            let available = true;
            let message = '';

            // Check if product exists and is available
            if (!product || product.isDeleted || !product.isApproved || !product.status) {
                return {
                    _id: item._id,
                    product: null,
                    variant: null,
                    qty: item.qty,
                    price: 0,
                    itemTotal: 0,
                    available: false,
                    maxQty: 0,
                    message: 'Product not available',
                    inStock: false
                };
            }

            // Handle different product types
            if (product.productType === PRODUCT_TYPES.SIMPLE) {
                // Simple product price calculation
                price = product.simpleProduct?.sp_specialPrice || 
                        product.simpleProduct?.sp_price || 
                        product.productLevelStock?.pls_price ||
                        0;
                maxQty = product.simpleProduct?.sp_totalStock || 0;

                if (product.simpleProduct?.sp_stockStatus !== STOCK_STATUS.IN_STOCK) {
                    available = false;
                    message = 'Out of stock';
                } else if (maxQty < item.qty) {
                    available = false;
                    message = `Only ${maxQty} items available`;
                }
            }
            else if (product.productType === PRODUCT_TYPES.VARIABLE) {
                // Variable product with variant
                if (!item.variantId) {
                    available = false;
                    message = 'Variant not selected';
                } else {
                    variant = product.variants?.id(item.variantId);
                    if (!variant || !variant.variant_isActive) {
                        available = false;
                        message = 'Variant not available';
                    } else {
                        price = variant.variant_specialPrice || variant.variant_price || 0;
                        
                        // Check stock status based on user's pinpointed rules
                        const totalVariantQty = product.variants?.reduce((sum, v) => sum + (v.variant_totalStock || 0), 0) || 0;

                        if (product.variantStockLevelType === 'product_level') {
                            maxQty = product.productLevelStock?.pls_totalStock || 0;
                            // Forced out if total variations qty zero
                            if (maxQty <= 0 || totalVariantQty <= 0) {
                                available = false;
                                message = 'Product out of stock';
                            }
                        } else {
                            // variable_level: Check quantity of specific variant
                            maxQty = variant.variant_totalStock || 0;
                            if (maxQty <= 0) {
                                available = false;
                                message = 'Variant out of stock';
                            }
                        }

                        if (available && maxQty < item.qty) {
                            available = false;
                            message = product.variantStockLevelType === 'product_level' 
                                ? `Only ${maxQty} items available for this product`
                                : `Only ${maxQty} items available for this variant`;
                        }
                    }
                }
            }
            else if (product.productType === PRODUCT_TYPES.DIGITAL || 
                     product.productType === 'digital_product') {
                // Digital product price calculation
                price = product.simpleProduct?.sp_specialPrice || 
                        product.simpleProduct?.sp_price || 
                        product.productLevelStock?.pls_price ||
                        0;
                
                // Digital products have different stock logic
                maxQty = product.simpleProduct?.sp_totalStock || 
                        product.totalAllowedQuantity || 
                        999999;
                
                const hasStock = !product.simpleProduct?.sp_totalStock || 
                                product.simpleProduct?.sp_totalStock > 0;
                
                if (!hasStock) {
                    available = false;
                    message = 'Digital product not available';
                } else {
                    // Check if trying to buy more than allowed
                    const maxAllowed = product.totalAllowedQuantity || 5;
                    if (item.qty > maxAllowed) {
                        available = false;
                        message = `Maximum ${maxAllowed} copies allowed per order`;
                    }
                }
            }
            else {
                // Unknown product type
                available = false;
                message = `Invalid product type: ${product.productType}`;
            }

            const itemTotal = price * item.qty;

            // Build variant details if exists
            let variantDetails = null;
            if (variant) {
                variantDetails = {
                    _id: variant._id,
                    variant_price: variant.variant_price,
                    variant_specialPrice: variant.variant_specialPrice,
                    variant_isActive: variant.variant_isActive,
                    variant_stockStatus: variant.variant_stockStatus,
                    variant_images: variant.variant_images || [],
                    variant_dimensions: {
                        variant_weight: variant.variant_weight,
                        height: variant.variant_height,
                        breadth: variant.variant_breadth,
                        length: variant.variant_length
                    },
                    variant_name: variant.variant_name,
                    variant_sku: variant.variant_sku,
                    attributes: variant.variant_attributes
                };
            }

            // Build product details
            const productDetails = {
                _id: product._id,
                name: product.name,
                mainImage: product.mainImage || product.images?.[0] || null,
                otherImages: product.otherImages || [],
                productType: product.productType,
                vendor: product.vendorId ? {
                    _id: product.vendorId._id,
                    name: product.vendorId.name,
                    email: product.vendorId.email,
                    businessName: product.vendorId.businessName
                } : null,
                // Add digital product flag
                isDigital: product.productType === PRODUCT_TYPES.DIGITAL || 
                          product.productType === 'digital_product'
            };

            return {
                _id: item._id,
                product: productDetails,
                variant: variantDetails,
                qty: item.qty,
                price,
                itemTotal,
                available,
                maxQty,
                message,
                inStock: available,
                // Add stock info based on product type
                stockInfo: product.productType === PRODUCT_TYPES.DIGITAL || 
                          product.productType === 'digital_product' ? {
                    type: 'digital',
                    available: maxQty >= item.qty,
                    remaining: maxQty - item.qty,
                    isUnlimited: maxQty >= 999999,
                    totalAllowed: product.totalAllowedQuantity || 5
                } : {
                    type: 'physical',
                    totalStock: maxQty,
                    available: maxQty - item.qty,
                    status: product.simpleProduct?.sp_stockStatus || 
                           variant?.variant_stockStatus || 
                           STOCK_STATUS.OUT_OF_STOCK
                }
            };
        }));

        // Filter available and unavailable items
        const availableItems = processedItems.filter(item => item.available);
        const unavailableItems = processedItems.filter(item => !item.available);

        // Fetch active subscription for the user
        const activeSub = await UserSubscription.findOne({
            userId,
            status: 'active',
            endDate: { $gt: new Date() }
        }).populate('subscriptionId');

        // Fetch user's default address for accurate delivery calculation
        const defaultAddress = await Address.findOne({ userId, is_default: true })
            .populate({
                path: 'area_id',
                select: 'delivery_charges minimum_free_delivery_order_amount'
            });

        // Calculate cart summary using helper function
        const summary = calculateCartSummary(availableItems, activeSub, defaultAddress);

        // Update cart if there are unavailable items (remove them)
        if (unavailableItems.length > 0) {
            const availableItemIds = availableItems.map(item => item._id);
            const updatedItems = cart.items.filter(item => 
                availableItemIds.includes(item._id.toString())
            );

            await Cart.findOneAndUpdate(
                { userId },
                { items: updatedItems },
                { new: true }
            );
        }

        res.status(200).json({
            success: true,
            message: availableItems.length > 0 ? 'Cart retrieved successfully' : 'Cart is empty',
            data: {
                items: availableItems,
                summary,
                unavailableItems: unavailableItems.map(item => ({
                    _id: item._id,
                    productName: item.product?.name || 'Unknown Product',
                    qty: item.qty,
                    message: item.message,
                    productType: item.product?.productType
                }))
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
};

// // Helper function to calculate cart summary
// const calculateCartSummary = (items) => {
//     const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
//     const subtotal = items.reduce((sum, item) => sum + (item.itemTotal || 0), 0);
    
//     // You can add discount calculation logic here if needed
//     const totalDiscount = 0;
//     const deliveryCharge = 0; // Calculate based on your logic
//     const taxAmount = 0; // Calculate based on your logic
    
//     const finalTotal = subtotal - totalDiscount + deliveryCharge + taxAmount;

//     return {
//         totalItems,
//         itemCount: items.length,
//         subtotal,
//         totalDiscount,
//         deliveryCharge,
//         taxAmount,
//         finalTotal,
//         // Add digital vs physical counts
//         digitalItemsCount: items.filter(item => item.product?.isDigital).length,
//         physicalItemsCount: items.filter(item => !item.product?.isDigital).length
//     };
// };

/**
 * Add item to cart
 */
const addToCart = async (req, res) => {
    console.log("req.body cart", req.body)
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;
        const { productId, variantId, qty } = req.body;

        // Validate input
        if (!productId) {
            throw new Error('Product ID is required');
        }

        if (!qty || qty < 1) {
            throw new Error('Quantity must be at least 1');
        }

        // Get product with minimal fields
        const product = await Product.findById(productId).session(session);
        console.log("product", product)
        if (!product) {
            throw new Error('Product not found');
        }

        // Check product availability
        if (product.isDeleted || !product.isApproved || !product.status) {
            throw new Error('Product is not available');
        }

        let price = 0;
        let totalStock = 0;
        let variant = null;
        let stockStatus = null;
        let selectedVariantDetails = null;
        let productDetails = null;

        // Get existing cart
        let cart = await Cart.findOne({ userId }).session(session);
        if (!cart) {
            cart = new Cart({
                userId,
                items: []
            });
        }

        // Find existing item in cart
        const existingItemIndex = cart.items.findIndex(item => {
            if (product.productType === PRODUCT_TYPES.VARIABLE) {
                return item.product.equals(productId) && 
                       (item.variantId?.equals(variantId) || (!item.variantId && !variantId));
            }
            return item.product.equals(productId) && !item.variantId;
        });

        const existingCartQty = existingItemIndex > -1 ? cart.items[existingItemIndex].qty : 0;

        if (product.productType === PRODUCT_TYPES.VARIABLE) {
            if (!variantId) {
                throw new Error('Variant ID is required for variable product');
            }

            variant = product.variants.id(variantId);
            if (!variant || !variant.variant_isActive) {
                throw new Error('Variant not available');
            }

            const totalVariantQty = product.variants?.reduce((sum, v) => sum + (v.variant_totalStock || 0), 0) || 0;

            if (product.variantStockLevelType === 'product_level') {
                totalStock = product.productLevelStock?.pls_totalStock || 0;
                if (totalStock <= 0 || totalVariantQty <= 0) {
                    throw new Error('Product is out of stock');
                }
                stockStatus = product.productLevelStock?.pls_stockStatus;
            } else {
                // variable_level: Check quantity of specific variant
                totalStock = variant.variant_totalStock || 0;
                if (totalStock <= 0) {
                    throw new Error('Variant is out of stock');
                }
                stockStatus = variant.variant_stockStatus;
            }

            price = variant.variant_specialPrice || variant.variant_price;

            // Extract only the needed variant details
            selectedVariantDetails = {
                _id: variant._id,
                variant_price: variant.variant_price,
                variant_specialPrice: variant.variant_specialPrice,
                variant_isActive: variant.variant_isActive,
                variant_stockStatus: variant.variant_stockStatus,
                variant_sku: variant.variant_sku,
                variant_name: variant.variant_name,
                variant_attributes: variant.variant_attributes,
                variant_images: variant.variant_images || [],
                variant_dimensions: {
                    variant_weight: variant.variant_weight,
                    height: variant.variant_height,
                    breadth: variant.variant_breadth,
                    length: variant.variant_length
                }
            };

            // Basic product info
            productDetails = {
                _id: product._id,
                name: product.name,
                productType: product.productType,
               mainImage: product.images?.[0] || product.mainImage || null,
                vendorId: product.vendorId
            };

        } else if (product.productType === PRODUCT_TYPES.SIMPLE ) {
            if (variantId) {
                throw new Error('Variant ID should not be provided for simple product');
            }

            if (product.simpleProduct.sp_stockStatus !== STOCK_STATUS.IN_STOCK) {
                throw new Error('Product is out of stock');
            }

            price = product.simpleProduct.sp_specialPrice || product.simpleProduct.sp_price;
            totalStock = product.simpleProduct.sp_totalStock;
            stockStatus = product.simpleProduct.sp_stockStatus;
            console.log("product type cart",product.productType)

            // Simple product details
            productDetails = {
                _id: product._id,
                name: product.name,
                productType: product.productType,
                images: product.images || [],
                description: product.description,
                vendorId: product.vendorId,
                simpleProduct: {
                    sp_sku: product.simpleProduct.sp_sku,
                    sp_price: product.simpleProduct.sp_price,
                    sp_specialPrice: product.simpleProduct.sp_specialPrice,
                    sp_stockStatus: product.simpleProduct.sp_stockStatus,
                    sp_weight: product.simpleProduct.sp_weight,
                    sp_dimensions: {
                        height: product.simpleProduct.sp_height,
                        breadth: product.simpleProduct.sp_breadth,
                        length: product.simpleProduct.sp_length
                    }
                }
            };
        }  else if (product.productType === PRODUCT_TYPES.DIGITAL || 
                 product.productType === 'digital_product') {
            
            if (variantId) {
                throw new Error('Variant ID should not be provided for digital product');
            }

            // Digital products have different stock logic
            // They might have unlimited stock or license-based stock
            const simpleProduct = product.simpleProduct || {};
            
            // For digital products, we consider them "in stock" if:
            // 1. They have a price set, AND
            // 2. Either they have no stock limit or have available stock
            const hasStock = !simpleProduct.sp_totalStock || simpleProduct.sp_totalStock > 0;
            const isAvailable = hasStock && simpleProduct.sp_stockStatus !== STOCK_STATUS.OUT_OF_STOCK;
            
            if (!isAvailable) {
                throw new Error('Digital product is not available');
            }

            // Get price - could be from simpleProduct or productLevel
            price = simpleProduct.sp_specialPrice || 
                    simpleProduct.sp_price || 
                    product.productLevelStock?.pls_price ||
                    0;

            // For digital products, stock might be:
            // - Unlimited (totalAllowedQuantity)
            // - Limited (sp_totalStock)
            // - License-based
            totalStock = simpleProduct.sp_totalStock || 
                        product.totalAllowedQuantity || 
                        999999; // High number for "unlimited"
            
            stockStatus = simpleProduct.sp_stockStatus || STOCK_STATUS.IN_STOCK;

            // Digital product details
            productDetails = {
                _id: product._id,
                name: product.name,
                productType: product.productType,
                isDigital: true,
                images: product.images || [],
                mainImage: product.mainImage || product.images?.[0] || null,
                description: product.description,
                vendorId: product.vendorId,
                downloadInfo: {
                    isDownloadable: true,
                    fileType: product.fileType || 'digital',
                    fileSize: product.fileSize || null
                },
                simpleProduct: {
                    sp_sku: simpleProduct.sp_sku,
                    sp_price: simpleProduct.sp_price,
                    sp_specialPrice: simpleProduct.sp_specialPrice
                }
            };
        } else {
            throw new Error('Invalid product type');
        }

        // Calculate new total quantity
        const newQty = existingCartQty + parseInt(qty);

         // Validate stock availability for non-digital products
        // Digital products might have different rules
        if (product.productType !== PRODUCT_TYPES.DIGITAL && 
            product.productType !== 'digital_product') {

        // Validate stock availability considering already reserved quantity
        if (newQty > totalStock) {
            const availableForAdd = totalStock - existingCartQty;
            throw new Error(
                availableForAdd > 0 
                    ? `Only ${availableForAdd} more items available. You already have ${existingCartQty} in cart.`
                    : 'Product is out of stock'
            );
        }
         } else {
            // For digital products, you might want to limit quantity per order
            const maxDigitalQty = product.totalAllowedQuantity || 5; // Default max 5 for digital
            if (newQty > maxDigitalQty) {
                throw new Error(`Maximum ${maxDigitalQty} copies allowed per order`);
            }
        }

        // Update or add item to cart
        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].qty = newQty;
            if (variantId && !cart.items[existingItemIndex].variantId) {
                cart.items[existingItemIndex].variantId = variantId;
            }
        } else {
            const newItem = {
                product: productId,
                qty: parseInt(qty)
            };
            if (variantId) newItem.variantId = variantId;
            cart.items.push(newItem);
        }

        await cart.save({ session });
        await session.commitTransaction();

        // Get cart summary (without heavy population)
        const updatedCart = await Cart.findOne({ userId })
            .populate({
                path: 'items.product',
                select: 'name productType images'
            })
            .lean();

        // Process cart items for response
        const cartItems = updatedCart.items.map(item => {
            const itemResponse = {
                _id: item._id,
                productId: item.product._id,
                productName: item.product.name,
                productType: item.product.productType,
                productImage: item.product.images?.[0] || null,
                qty: item.qty,
                variantId: item.variantId || null
            };

            // Add price and total if it's the item we just updated
            if (item.product._id.toString() === productId.toString() && 
                (!variantId || (item.variantId && item.variantId.toString() === variantId.toString()))) {
                itemResponse.price = price;
                itemResponse.itemTotal = price * item.qty;
            }

            return itemResponse;
        });

        const finalQty = existingItemIndex > -1 ? cart.items[existingItemIndex].qty : parseInt(qty);
        const itemTotal = price * finalQty;

        // Build clean response
        const response = {
            success: true,
            message: existingItemIndex > -1 ? 'Cart item updated' : 'Item added to cart',
            data: {
                action: existingItemIndex > -1 ? 'updated' : 'added',
                item: {
                    product: productDetails,
                    variant: selectedVariantDetails,
                    qty: finalQty,
                    price,
                    itemTotal,
                    stockInfo: {
                        totalStock,
                        available: totalStock - finalQty,
                        status: stockStatus
                    }
                },
                cartSummary: {
                    totalItems: cartItems.reduce((sum, item) => sum + item.qty, 0),
                    itemCount: cartItems.length,
                    totalAmount: cartItems.reduce((sum, item) => sum + (item.itemTotal || 0), 0)
                }
            }
        };

        res.status(200).json(response);

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
};
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
        console.log()

        let availableQty = 0;

        if (product.productType === PRODUCT_TYPES.VARIABLE && item.variantId) {
            const variant = product.variants.id(item.variantId);
            if (!variant) {
                throw new Error('Variant not found');
            }
            if (product.variantStockLevelType === 'product_level') {
                availableQty = product.productLevelStock?.pls_totalStock || 0;
            } else {
                availableQty = variant.variant_totalStock || 0;
            }
        }
    else if (product.productType === PRODUCT_TYPES.SIMPLE || product.productType === PRODUCT_TYPES.DIGITAL) {
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
const calculateCartSummary = (items, activeSub = null, defaultAddress = null) => {
    const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.itemTotal, 0);
    const totalDiscount = 0; // Implement discount logic if needed
    
    // 1. Get Base Delivery Charge and Free Delivery Threshold from Area
    // Default to 50 charge and 499 threshold if not specified in DB
    const areaCharge = parseFloat(defaultAddress?.area_id?.delivery_charges ?? 50);
    const freeDeliveryThreshold = parseFloat(defaultAddress?.area_id?.minimum_free_delivery_order_amount ?? 499);
    
    // 2. Initial Delivery Charge calculation based on Threshold
    let deliveryCharge = totalPrice >= freeDeliveryThreshold ? 0 : areaCharge;
    let memberBenefitApplied = false;

    // 3. Override with Subscription Benefits
    if (activeSub && activeSub.subscriptionId) {
        const subType = activeSub.subscriptionId.type; // 'customer' or 'vendor'
        
        // Rule: If already free by threshold, we don't 'use up' a subscription benefit if it's limited
        if (deliveryCharge > 0) {
            if (subType === 'vendor') {
                // Vendors retain their "always free" benefit
                deliveryCharge = 0;
                memberBenefitApplied = true;
            } else if (subType === 'customer') {
                // IMPORTANT: Customers NO LONGER get free delivery under 499
                // So we do not override deliveryCharge here for customers.
                memberBenefitApplied = false;
            }
        } else {
            // Already free by threshold
            memberBenefitApplied = false; 
        }
    }

    const finalTotal = totalPrice + deliveryCharge - totalDiscount;

    return {
        totalItems,
        totalPrice,
        totalDiscount,
        deliveryCharge,
        finalTotal,
        itemsCount: items.length,
        freeDeliveryThreshold, // Return current threshold for UI display
        subscriptionBenefit: {
            isApplied: memberBenefitApplied,
            activePlanName: activeSub?.subscriptionId?.name || null
        }
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