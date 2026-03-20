const Order = require('../models/orders');
const OrderItem = require('../models/orderItem');
const DeliveryBoy = require('../models/deliveryBoy');
const mongoose = require('mongoose');

/**
 * GET /api/delivery/orders
 * Fetch order items assigned to the authenticated delivery boy
 */
const getOrders = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Find delivery boy profile
        const deliveryBoy = await DeliveryBoy.findOne({ user_id: userId });
        if (!deliveryBoy) {
            return res.status(404).json({
                success: false,
                message: 'Delivery boy profile not found'
            });
        }

        const { page = 1, limit = 10, status, search } = req.query;

        // 2. Find orders assigned to this delivery boy
        const orderQuery = { 'delivery_info.boy_id': deliveryBoy._id };
        
        // Find order IDs
        const assignedOrders = await Order.find(orderQuery).select('_id');
        const orderIds = assignedOrders.map(o => o._id);

        if (orderIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                pagination: { current_page: 1, total_pages: 0, total_items: 0 }
            });
        }

        // 3. Find OrderItems for these orders
        const itemQuery = { order_id: { $in: orderIds } };
        
        if (status) {
            itemQuery.status = status;
        }

        if (search) {
            itemQuery.$or = [
                { product_name: { $regex: search, $options: 'i' } },
                { variant_name: { $regex: search, $options: 'i' } }
            ];
            // Also search by order number if needed? 
            // This is harder in a flat query, but we can do it if we populate.
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const items = await OrderItem.find(itemQuery)
            .populate({
                path: 'order_id',
                select: 'order_number delivery_address payment status'
            })
            .populate({
                path: 'user_id',
                select: 'username email mobile'
            })
            .sort({ date_added: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await OrderItem.countDocuments(itemQuery);

        res.status(200).json({
            success: true,
            data: items,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / parseInt(limit)),
                total_items: total
            }
        });

    } catch (error) {
        console.error('getOrders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch delivery orders',
            error: error.message
        });
    }
};

/**
 * PATCH /api/delivery/orders/:id/status
 * Update order item status with optional image confirmation
 */
const updateStatus = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { status, image, notes } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const item = await OrderItem.findById(id).session(session);
        if (!item) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Order item not found'
            });
        }

        // Validate image for delivered status
        if (status === 'delivered' && !image) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Image confirmation is required for delivery'
            });
        }

        // Update item status
        item.status = status;
        
        // Add to history
        const historyEntry = {
            status,
            timestamp: new Date(),
            notes: notes || undefined,
            confirmation_image: image || undefined
        };

        item.status_history.push(historyEntry);

        item.updated_by = req.user._id;

        await item.save({ session });

        // If status is delivered, update parent order if all items are delivered
        if (status === 'delivered') {
            const allItems = await OrderItem.find({ order_id: item.order_id }).session(session);
            const allDelivered = allItems.every(i => i.status === 'delivered');
            
            if (allDelivered) {
                await Order.findByIdAndUpdate(item.order_id, {
                    $set: { 
                        status: 'delivered',
                        'delivery_info.delivered_at': new Date(),
                        'payment.status': 'paid'
                    }
                }, { session });
            }
        }

        // Handle other parent order status updates (picked_up, etc.)
        if (['picked_up', 'shipped'].includes(status)) {
            await Order.findByIdAndUpdate(item.order_id, {
                $set: { status: status }
            }, { session });
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: `Status updated to ${status} successfully`,
            data: item
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('updateStatus error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message
        });
    }
};

/**
 * POST /api/delivery/upload-image
 * Upload a delivery confirmation image to Cloudinary
 */
const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Image uploaded successfully',
            url: req.file.path // Cloudinary URL
        });
    } catch (error) {
        console.error('uploadImage error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: error.message
        });
    }
};

module.exports = {
    getOrders,
    updateStatus,
    uploadImage
};

