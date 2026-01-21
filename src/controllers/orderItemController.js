const OrderItem = require('../models/orderItem');
const Order = require('../models/order');
const User = require('../models/User');
const ProductVariant = require('../models/product');
const mongoose = require('mongoose');

/**
 * ORDER ITEM CRUD CONTROLLER
 */

// 1. CREATE - Create single order item (usually done via Order creation)
const createOrderItem = async (req, res) => {
    try {
        const {
            order_id,
            user_id,
            seller_id,
            product_variant_id,
            product_name,
            variant_name,
            quantity,
            price,
            discounted_price,
            tax_percent = 0,
            discount = 0,
            admin_commission_amount = 0,
            seller_commission_amount = 0
        } = req.body;

        // Validate required fields
        const requiredFields = {
            order_id, user_id, seller_id, product_variant_id,
            product_name, quantity, price
        };
        
        const missingFields = Object.entries(requiredFields)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Validate IDs
        const idsToValidate = { order_id, user_id, seller_id, product_variant_id };
        for (const [field, value] of Object.entries(idsToValidate)) {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid ${field.replace('_', ' ')} format`
                });
            }
        }

        // Check if order exists
        const orderExists = await Order.findById(order_id);
        if (!orderExists) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user exists
        const userExists = await User.findById(user_id);
        if (!userExists) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if seller exists
        const sellerExists = await User.findById(seller_id);
        if (!sellerExists) {
            return res.status(404).json({
                success: false,
                message: 'Seller not found'
            });
        }

        // Check if product variant exists
        const productVariantExists = await ProductVariant.findById(product_variant_id);
        if (!productVariantExists) {
            return res.status(404).json({
                success: false,
                message: 'Product variant not found'
            });
        }

        // Calculate sub_total
        const finalPrice = discounted_price || price;
        const subTotal = finalPrice * quantity;
        const taxAmount = (subTotal * tax_percent) / 100;

        // Create order item
        const orderItem = new OrderItem({
            order_id,
            user_id,
            seller_id,
            product_variant_id,
            product_name: product_name.trim(),
            variant_name: variant_name?.trim() || null,
            quantity,
            price,
            discounted_price: discounted_price || null,
            tax_percent,
            tax_amount: taxAmount,
            discount,
            sub_total: subTotal,
            admin_commission_amount,
            seller_commission_amount,
            active_status: 'awaiting',
            status_history: [{
                status: 'awaiting',
                timestamp: new Date()
            }]
        });

        await orderItem.save();

        // Populate for response
        const populatedItem = await OrderItem.findById(orderItem._id)
            .populate('order_id', 'order_number total status')
            .populate('seller_id', 'username email mobile')
            .populate('product_variant_id', 'sku stock')
            .lean();

        res.status(201).json({
            success: true,
            message: 'Order item created successfully',
            data: populatedItem
        });

    } catch (error) {
        console.error('Error creating order item:', error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: messages
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to create order item',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// 2. BULK CREATE - Create multiple order items (for order creation)
const bulkCreateOrderItems = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { order_id, items } = req.body;

        if (!order_id || !Array.isArray(items) || items.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Order ID and items array are required'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(order_id)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Invalid Order ID format'
            });
        }

        // Check if order exists
        const order = await Order.findById(order_id).session(session);
        if (!order) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const createdItems = [];
        const errors = [];

        for (const [index, item] of items.entries()) {
            try {
                // Validate item
                const required = ['product_variant_id', 'product_name', 'quantity', 'price', 'seller_id'];
                const missing = required.filter(field => !item[field]);
                
                if (missing.length > 0) {
                    errors.push({
                        index,
                        error: `Missing fields: ${missing.join(', ')}`,
                        item
                    });
                    continue;
                }

                // Calculate item totals
                const finalPrice = item.discounted_price || item.price;
                const subTotal = finalPrice * item.quantity;
                const taxPercent = item.tax_percent || 0;
                const taxAmount = (subTotal * taxPercent) / 100;

                const orderItem = new OrderItem({
                    order_id,
                    user_id: order.user_id, // Inherit from order
                    seller_id: item.seller_id,
                    product_variant_id: item.product_variant_id,
                    product_name: item.product_name.trim(),
                    variant_name: item.variant_name?.trim() || null,
                    quantity: item.quantity,
                    price: item.price,
                    discounted_price: item.discounted_price || null,
                    tax_percent: taxPercent,
                    tax_amount: taxAmount,
                    discount: item.discount || 0,
                    sub_total: subTotal,
                    admin_commission_amount: item.admin_commission_amount || 0,
                    seller_commission_amount: item.seller_commission_amount || 0,
                    active_status: 'awaiting',
                    status_history: [{
                        status: 'awaiting',
                        timestamp: new Date()
                    }]
                });

                await orderItem.save({ session });
                createdItems.push(orderItem._id);

            } catch (itemError) {
                errors.push({
                    index,
                    error: itemError.message,
                    item
                });
            }
        }

        // If all items failed
        if (createdItems.length === 0 && errors.length > 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'All items failed validation',
                errors
            });
        }

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: 'Order items created successfully',
            data: {
                total_requested: items.length,
                successful: createdItems.length,
                failed: errors.length,
                created_ids: createdItems,
                errors: errors.length > 0 ? errors : undefined
            }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        
        console.error('Error bulk creating order items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order items',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// 3. READ - Get all order items (with filtering)
const getAllOrderItems = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            order_id,
            seller_id,
            user_id,
            product_variant_id,
            active_status,
            start_date,
            end_date,
            search,
            sort_by = 'date_added',
            sort_order = 'desc'
        } = req.query;

        // Build query
        const query = {};

        // Filter by order
        if (order_id) {
            if (!mongoose.Types.ObjectId.isValid(order_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Order ID format'
                });
            }
            query.order_id = order_id;
        }

        // Filter by seller
        if (seller_id) {
            if (!mongoose.Types.ObjectId.isValid(seller_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Seller ID format'
                });
            }
            query.seller_id = seller_id;
        }

        // Filter by user
        if (user_id) {
            if (!mongoose.Types.ObjectId.isValid(user_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid User ID format'
                });
            }
            query.user_id = user_id;
        }

        // Filter by product variant
        if (product_variant_id) {
            if (!mongoose.Types.ObjectId.isValid(product_variant_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Product Variant ID format'
                });
            }
            query.product_variant_id = product_variant_id;
        }

        // Filter by status
        if (active_status) {
            query.active_status = active_status;
        }

        // Filter by date range
        if (start_date || end_date) {
            query.date_added = {};
            if (start_date) query.date_added.$gte = new Date(start_date);
            if (end_date) query.date_added.$lte = new Date(end_date);
        }

        // Search in product name
        if (search) {
            query.product_name = { $regex: search, $options: 'i' };
        }

        // Calculate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get total count
        const total = await OrderItem.countDocuments(query);

        // Determine sort
        const sort = {};
        sort[sort_by] = sort_order === 'desc' ? -1 : 1;

        // Get order items with populated data
        const orderItems = await OrderItem.find(query)
            .populate('order_id', 'order_number status date_added')
            .populate('seller_id', 'username email mobile')
            .populate('user_id', 'username email')
            .populate('product_variant_id', 'sku product_id')
            .populate({
                path: 'product_variant_id',
                populate: {
                    path: 'product_id',
                    select: 'name category images'
                }
            })
            .populate('delivery_boy_id', 'username mobile')
            .sort(sort)
            .skip(skip)
            .limit(limitNum)
            .lean();

        // Get summary statistics
        const summary = {
            total_items: total,
            total_quantity: await OrderItem.aggregate([
                { $match: query },
                { $group: { _id: null, total: { $sum: '$quantity' } } }
            ]).then(result => result[0]?.total || 0),
            total_revenue: await OrderItem.aggregate([
                { $match: query },
                { $group: { _id: null, total: { $sum: '$sub_total' } } }
            ]).then(result => result[0]?.total || 0),
            status_counts: await OrderItem.aggregate([
                { $match: query },
                { $group: { _id: '$active_status', count: { $sum: 1 } } }
            ])
        };

        res.status(200).json({
            success: true,
            message: 'Order items retrieved successfully',
            data: {
                order_items: orderItems,
                summary,
                pagination: {
                    current_page: pageNum,
                    total_pages: Math.ceil(total / limitNum),
                    total_items: total,
                    items_per_page: limitNum,
                    has_next: pageNum < Math.ceil(total / limitNum),
                    has_previous: pageNum > 1
                }
            }
        });

    } catch (error) {
        console.error('Error fetching order items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order items'
        });
    }
};

// 4. READ - Get order item by ID
const getOrderItemById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Order Item ID format'
            });
        }

        // Get order item with populated data
        const orderItem = await OrderItem.findById(id)
            .populate('order_id', 'order_number status user_id address date_added')
            .populate('seller_id', 'username email mobile shop_name')
            .populate('user_id', 'username email mobile')
            .populate('delivery_boy_id', 'username mobile vehicle_number')
            .populate('product_variant_id', 'sku price stock product_id')
            .populate({
                path: 'product_variant_id',
                populate: {
                    path: 'product_id',
                    select: 'name category brand images'
                }
            })
            .populate('updated_by', 'username email')
            .lean();

        if (!orderItem) {
            return res.status(404).json({
                success: false,
                message: 'Order item not found'
            });
        }

        // Calculate commission percentages
        const totalAmount = orderItem.sub_total;
        const commissionInfo = {
            admin_commission_percent: totalAmount > 0 ? 
                (orderItem.admin_commission_amount / totalAmount) * 100 : 0,
            seller_commission_percent: totalAmount > 0 ? 
                (orderItem.seller_commission_amount / totalAmount) * 100 : 0,
            seller_payout: totalAmount - orderItem.admin_commission_amount
        };

        res.status(200).json({
            success: true,
            message: 'Order item retrieved successfully',
            data: {
                ...orderItem,
                commission_info: commissionInfo,
                financial_summary: {
                    item_total: orderItem.sub_total,
                    tax_amount: orderItem.tax_amount,
                    discount_amount: orderItem.discount,
                    final_amount: orderItem.sub_total + orderItem.tax_amount - orderItem.discount
                }
            }
        });

    } catch (error) {
        console.error('Error fetching order item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order item'
        });
    }
};

// 5. READ - Get order items by order ID
const getOrderItemsByOrder = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { 
            seller_id, 
            active_status,
            group_by_seller = 'false'
        } = req.query;

        // Validate order ID
        if (!mongoose.Types.ObjectId.isValid(order_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Order ID format'
            });
        }

        // Check if order exists
        const order = await Order.findById(order_id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Build query
        const query = { order_id };
        
        if (seller_id) {
            if (!mongoose.Types.ObjectId.isValid(seller_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Seller ID format'
                });
            }
            query.seller_id = seller_id;
        }
        
        if (active_status) {
            query.active_status = active_status;
        }

        // Get order items
        const orderItems = await OrderItem.find(query)
            .populate('seller_id', 'username shop_name')
            .populate('product_variant_id', 'sku')
            .populate({
                path: 'product_variant_id',
                populate: {
                    path: 'product_id',
                    select: 'name images'
                }
            })
            .sort({ date_added: 1 })
            .lean();

        // Group by seller if requested
        let groupedData = null;
        if (group_by_seller === 'true') {
            groupedData = {};
            orderItems.forEach(item => {
                const sellerId = item.seller_id._id.toString();
                if (!groupedData[sellerId]) {
                    groupedData[sellerId] = {
                        seller: item.seller_id,
                        items: [],
                        total_amount: 0,
                        total_quantity: 0
                    };
                }
                groupedData[sellerId].items.push(item);
                groupedData[sellerId].total_amount += item.sub_total;
                groupedData[sellerId].total_quantity += item.quantity;
            });
        }

        // Calculate order summary
        const orderSummary = {
            total_items: orderItems.length,
            total_quantity: orderItems.reduce((sum, item) => sum + item.quantity, 0),
            total_amount: orderItems.reduce((sum, item) => sum + item.sub_total, 0),
            sellers_count: new Set(orderItems.map(item => item.seller_id._id.toString())).size,
            status_breakdown: orderItems.reduce((acc, item) => {
                acc[item.active_status] = (acc[item.active_status] || 0) + 1;
                return acc;
            }, {})
        };

        res.status(200).json({
            success: true,
            message: 'Order items retrieved successfully',
            data: {
                order: {
                    id: order._id,
                    order_number: order.order_number,
                    status: order.status,
                    total: order.total
                },
                items: orderItems,
                grouped_by_seller: grouped_by_seller === 'true' ? Object.values(groupedData) : undefined,
                summary: orderSummary
            }
        });

    } catch (error) {
        console.error('Error fetching order items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order items'
        });
    }
};

// 6. UPDATE - Update order item status
const updateOrderItemStatus = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { id } = req.params;
        const { 
            active_status, 
            notes, 
            updated_by,
            otp,
            deliver_by,
            delivery_boy_id 
        } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Invalid Order Item ID format'
            });
        }

        // Validate status
        const validStatuses = ['awaiting', 'received', 'processed', 'shipped', 'delivered', 'cancelled', 'returned'];
        if (!active_status || !validStatuses.includes(active_status)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Invalid status. Valid statuses: ${validStatuses.join(', ')}`
            });
        }

        // Get order item
        const orderItem = await OrderItem.findById(id).session(session);
        if (!orderItem) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Order item not found'
            });
        }

        // Check if status transition is valid
        if (!isValidItemStatusTransition(orderItem.active_status, active_status)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Cannot change status from ${orderItem.active_status} to ${active_status}`
            });
        }

        // Update order item
        orderItem.active_status = active_status;
        
        // Add to status history
        orderItem.status_history.push({
            status: active_status,
            timestamp: new Date(),
            notes: notes || undefined
        });

        // Update additional fields if provided
        if (delivery_boy_id) {
            if (!mongoose.Types.ObjectId.isValid(delivery_boy_id)) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Delivery Boy ID format'
                });
            }
            orderItem.delivery_boy_id = delivery_boy_id;
        }
        
        if (otp !== undefined) orderItem.otp = otp;
        if (deliver_by) orderItem.deliver_by = deliver_by;
        if (updated_by) orderItem.updated_by = updated_by;

        await orderItem.save({ session });

        // Update order status if all items have same status
        await updateParentOrderStatus(orderItem.order_id, session);

        await session.commitTransaction();
        session.endSession();

        // Get updated item
        const updatedItem = await OrderItem.findById(id)
            .populate('order_id', 'order_number')
            .populate('seller_id', 'username')
            .lean();

        // Send notifications
        await sendOrderItemStatusNotification(
            orderItem.user_id,
            orderItem.seller_id,
            orderItem.order_id,
            active_status
        );

        res.status(200).json({
            success: true,
            message: `Order item status updated to ${active_status}`,
            data: updatedItem
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        
        console.error('Error updating order item status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order item status'
        });
    }
};

// 7. UPDATE - Update order item details
const updateOrderItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Order Item ID format'
            });
        }

        // Get order item
        const orderItem = await OrderItem.findById(id);
        if (!orderItem) {
            return res.status(404).json({
                success: false,
                message: 'Order item not found'
            });
        }

        // Check if item can be modified
        if (!canModifyOrderItem(orderItem)) {
            return res.status(400).json({
                success: false,
                message: `Cannot modify order item in ${orderItem.active_status} status`
            });
        }

        // Allowed fields to update
        const allowedFields = [
            'discounted_price', 'tax_percent', 'discount',
            'admin_commission_amount', 'seller_commission_amount',
            'deliver_by', 'notes'
        ];
        
        const updateFields = {};
        
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                updateFields[field] = updateData[field];
            }
        });

        // Recalculate if price-related fields changed
        const needsRecalculation = 
            updateFields.discounted_price !== undefined ||
            updateFields.tax_percent !== undefined ||
            updateFields.discount !== undefined;

        if (needsRecalculation) {
            const finalPrice = updateFields.discounted_price || orderItem.discounted_price || orderItem.price;
            const quantity = orderItem.quantity;
            const taxPercent = updateFields.tax_percent || orderItem.tax_percent;
            const discount = updateFields.discount || orderItem.discount;
            
            const subTotal = finalPrice * quantity;
            const taxAmount = (subTotal * taxPercent) / 100;
            
            updateFields.sub_total = subTotal;
            updateFields.tax_amount = taxAmount;
            updateFields.discount = discount;
        }

        // Update order item
        const updatedItem = await OrderItem.findByIdAndUpdate(
            id,
            updateFields,
            { new: true, runValidators: true }
        )
        .populate('order_id', 'order_number')
        .populate('seller_id', 'username')
        .lean();

        res.status(200).json({
            success: true,
            message: 'Order item updated successfully',
            data: updatedItem
        });

    } catch (error) {
        console.error('Error updating order item:', error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: messages
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to update order item'
        });
    }
};

// 8. UPDATE - Mark commission as credited
const markCommissionAsCredited = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { id } = req.params;
        const { credited_by } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Invalid Order Item ID format'
            });
        }

        // Get order item
        const orderItem = await OrderItem.findById(id).session(session);
        if (!orderItem) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Order item not found'
            });
        }

        // Check if already credited
        if (orderItem.is_credited) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Commission already credited'
            });
        }

        // Check if item is delivered
        if (orderItem.active_status !== 'delivered') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Commission can only be credited for delivered items'
            });
        }

        // Mark as credited
        orderItem.is_credited = true;
        orderItem.updated_by = credited_by || null;
        
        // Add to status history
        orderItem.status_history.push({
            status: 'commission_credited',
            timestamp: new Date(),
            notes: 'Commission credited to seller'
        });

        await orderItem.save({ session });

        // Credit amount to seller's wallet
        await User.findByIdAndUpdate(
            orderItem.seller_id,
            { 
                $inc: { 
                    balance: orderItem.seller_commission_amount,
                    cash_received: orderItem.seller_commission_amount 
                } 
            },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: 'Commission credited successfully',
            data: {
                order_item_id: orderItem._id,
                seller_id: orderItem.seller_id,
                amount_credited: orderItem.seller_commission_amount,
                credited_at: new Date()
            }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        
        console.error('Error crediting commission:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to credit commission'
        });
    }
};

// 9. DELETE - Cancel/remove order item
const cancelOrderItem = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { id } = req.params;
        const { reason, initiated_by } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Invalid Order Item ID format'
            });
        }

        // Get order item
        const orderItem = await OrderItem.findById(id).session(session);
        if (!orderItem) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Order item not found'
            });
        }

        // Check if can be cancelled
        if (!canCancelOrderItem(orderItem)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Cannot cancel item in ${orderItem.active_status} status`
            });
        }

        // Update status to cancelled
        orderItem.active_status = 'cancelled';
        orderItem.status_history.push({
            status: 'cancelled',
            timestamp: new Date(),
            notes: `Cancelled by ${initiated_by}: ${reason}`
        });

        await orderItem.save({ session });

        // Update order totals
        await updateOrderTotals(orderItem.order_id, session);

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: 'Order item cancelled successfully',
            data: {
                order_item_id: orderItem._id,
                product_name: orderItem.product_name,
                status: orderItem.active_status,
                refund_amount: orderItem.sub_total,
                cancelled_at: new Date()
            }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        
        console.error('Error cancelling order item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order item'
        });
    }
};

// 10. ANALYTICS - Get seller performance
const getSellerPerformance = async (req, res) => {
    try {
        const { seller_id } = req.params;
        const { start_date, end_date } = req.query;

        if (!mongoose.Types.ObjectId.isValid(seller_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Seller ID format'
            });
        }

        // Check if seller exists
        const seller = await User.findById(seller_id);
        if (!seller) {
            return res.status(404).json({
                success: false,
                message: 'Seller not found'
            });
        }

        // Build match query
        const matchQuery = { seller_id: mongoose.Types.ObjectId(seller_id) };
        if (start_date || end_date) {
            matchQuery.date_added = {};
            if (start_date) matchQuery.date_added.$gte = new Date(start_date);
            if (end_date) matchQuery.date_added.$lte = new Date(end_date);
        }

        // Get performance metrics
        const performance = await OrderItem.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    total_items_sold: { $sum: '$quantity' },
                    total_revenue: { $sum: '$sub_total' },
                    total_commission: { $sum: '$seller_commission_amount' },
                    total_orders: { $addToSet: '$order_id' },
                    status_counts: {
                        $push: '$active_status'
                    }
                }
            },
            {
                $project: {
                    total_items_sold: 1,
                    total_revenue: 1,
                    total_commission: 1,
                    total_orders: { $size: '$total_orders' },
                    avg_order_value: { $divide: ['$total_revenue', { $size: '$total_orders' }] },
                    status_counts: {
                        $arrayToObject: {
                            $map: {
                                input: { $setUnion: ['$status_counts'] },
                                as: 'status',
                                in: {
                                    k: '$$status',
                                    v: {
                                        $size: {
                                            $filter: {
                                                input: '$status_counts',
                                                as: 's',
                                                cond: { $eq: ['$$s', '$$status'] }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ]);

        // Get top selling products
        const topProducts = await OrderItem.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$product_variant_id',
                    product_name: { $first: '$product_name' },
                    total_sold: { $sum: '$quantity' },
                    total_revenue: { $sum: '$sub_total' }
                }
            },
            { $sort: { total_sold: -1 } },
            { $limit: 10 }
        ]);

        // Get monthly performance
        const monthlyPerformance = await OrderItem.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: {
                        year: { $year: '$date_added' },
                        month: { $month: '$date_added' }
                    },
                    total_sales: { $sum: '$sub_total' },
                    total_items: { $sum: '$quantity' },
                    total_orders: { $addToSet: '$order_id' }
                }
            },
            {
                $project: {
                    period: {
                        $concat: [
                            { $toString: '$_id.year' },
                            '-',
                            { $toString: { $cond: [{ $lt: ['$_id.month', 10] }, { $concat: ['0', { $toString: '$_id.month' }] }, { $toString: '$_id.month' }] } }
                        ],
                    },
                    total_sales: 1,
                    total_items: 1,
                    total_orders: { $size: '$total_orders' }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
        ]);

        res.status(200).json({
            success: true,
            message: 'Seller performance retrieved',
            data: {
                seller: {
                    id: seller._id,
                    username: seller.username,
                    shop_name: seller.shop_name || 'N/A'
                },
                performance: performance[0] || {
                    total_items_sold: 0,
                    total_revenue: 0,
                    total_commission: 0,
                    total_orders: 0,
                    avg_order_value: 0,
                    status_counts: {}
                },
                top_products: topProducts,
                monthly_performance: monthlyPerformance,
                summary: {
                    period: start_date && end_date ? 
                        `${start_date} to ${end_date}` : 'All time'
                }
            }
        });

    } catch (error) {
        console.error('Error fetching seller performance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch seller performance'
        });
    }
};

// ================= HELPER FUNCTIONS =================

// Check if item status transition is valid
function isValidItemStatusTransition(currentStatus, newStatus) {
    const transitions = {
        'awaiting': ['received', 'cancelled'],
        'received': ['processed', 'cancelled'],
        'processed': ['shipped', 'cancelled'],
        'shipped': ['delivered', 'cancelled'],
        'delivered': ['returned'],
        'cancelled': [],
        'returned': []
    };
    
    return transitions[currentStatus]
}


module.exports = {
    getSellerPerformance,
    cancelOrderItem,
    markCommissionAsCredited,
    updateOrderItem,
    updateOrderItemStatus,
    getOrderItemsByOrder,
    getOrderItemById,
    getAllOrderItems,
    bulkCreateOrderItems,
    createOrderItem
}