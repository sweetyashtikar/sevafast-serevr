const Area = require('../models/area')
const Zipcode = require('../models/zipcode')


const checkShippingServiceability = async (req, res) => {
    try {
        const { pincode, weight = 0.5, shipping_method = 'shiprocket' } = req.body;

        if (!pincode) return res.status(400).json({ success: false, message: "pincode is required" })

        let serviceability = 0;
        let deliveryCharge = 0;

        if (shipping_method === 'shiprocket') {
            //check ship rocket serviceability
            serviceability = await shipRocketService.checkServiceability(
                pincode,
                parseFloat(weight),
                15, //length
                15, // breadth
                15 //height
            )

            if (serviceability.data.available) {
                deliveryCharge = parseFloat(serviceability.data.freight_charge) || 0;
            }
        } else {
            //check local delivery based on your area system
            const zipcode = await Zipcode.findOne({ zipcode })
            if (!zipcode) return res.status(400).json({ success: false, message: 'zipcode not found' })

            const area = await Area.findOne({ zipcode_id: zipcode._id })
            if (!area) return res.status(400).json({ success: false, message: 'area not found' })
            if (area) {
                deliveryCharge = parseFloat(area.delivery_charges) || 0;
                serviceability = {
                    available: true,
                    data: {
                        courier_name: 'Local Delivery',
                        estimated_days: '1-2',
                        freight_charge: deliveryCharge
                    }
                }
            }else{
                serviceability = {
                     available: false,
                    message: 'Delivery not available to this pincode'
                }
            }
        }
         res.json({
            success: true,
            data: {
                serviceability,
                delivery_charge: deliveryCharge,
                shipping_method,
                estimated_days: serviceability.data?.estimated_days || '3-5'
            }
        });

    } catch (error) {
        console.error('Error checking shipping serviceability:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check shipping serviceability',
            error: error.message
        });
    }
}

// Create ShipRocket shipment
const createShipRocketShipment = async (req, res) => {
    try {
        const { order_id } = req.params;
        const user = req.user;
        
        const order = await Order.findById(order_id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Check if order is already shipped
        if (order.delivery_info?.shiprocket_shipment_id) {
            return res.status(400).json({
                success: false,
                message: 'Shipment already created for this order'
            });
        }
        
        // Get user and address
        const userDetails = await User.findById(order.user_id);
        const address = await Address.findById(order.address_id)
            .populate('city_id', 'name');
        
        // Create shipment
        const shipment = await createShipRocketShipmentInBackground(order_id, userDetails, address);
        
        // Update order status if needed
        if (order.status === 'received' || order.status === 'processed') {
            order.status = 'shipped';
            order.status_timestamps.shipped = new Date();
            await order.save();
        }
        
        res.json({
            success: true,
            message: 'ShipRocket shipment created successfully',
            data: {
                shipment_id: shipment.shipment_id,
                awb_number: shipment.awb_code,
                label_url: order.delivery_info.shiprocket_label_url,
                courier_name: shipment.courier_name,
                tracking_url: shipment.tracking_url
            }
        });
        
    } catch (error) {
        console.error('Error creating ShipRocket shipment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create ShipRocket shipment',
            error: error.message
        });
    }
};

// Get shipping label
const getShippingLabel = async (req, res) => {
    try {
        const { order_id } = req.params;
        const user = req.user;
        
        const order = await Order.findById(order_id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Check permissions
        if (user.role !== 'admin' && order.user_id.toString() !== user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this label'
            });
        }
        
        const shipmentId = order.delivery_info?.shiprocket_shipment_id;
        if (!shipmentId) {
            return res.status(404).json({
                success: false,
                message: 'Shipment not created yet'
            });
        }
        
        // Get label
        const label = await ShipRocketService.generateLabel(shipmentId);
        
        res.json({
            success: true,
            data: {
                label_url: label.label_url,
                label_pdf: label.label_pdf,
                shipment_id: shipmentId
            }
        });
        
    } catch (error) {
        console.error('Error getting shipping label:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get shipping label',
            error: error.message
        });
    }
};

// Track shipment
const trackShipment = async (req, res) => {
    try {
        const { order_id } = req.params;
        const user = req.user;
        
        const order = await Order.findById(order_id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Check permissions
        if (user.role !== 'admin' && order.user_id.toString() !== user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to track this shipment'
            });
        }
        
        const awbNumber = order.delivery_info?.shiprocket_awb_number;
        if (!awbNumber) {
            return res.status(404).json({
                success: false,
                message: 'AWB number not available'
            });
        }
        
        // Track shipment
        const tracking = await ShipRocketService.trackOrder(awbNumber);
        
        // Update order status based on tracking if needed
        if (tracking.tracking_data?.shipment_status) {
            const shipmentStatus = tracking.tracking_data.shipment_status.toLowerCase();
            
            // Map ShipRocket status to your order status
            const statusMap = {
                'delivered': 'delivered',
                'out for delivery': 'shipped',
                'picked up': 'shipped',
                'in transit': 'shipped'
            };
            
            const newStatus = statusMap[shipmentStatus];
            if (newStatus && order.status !== newStatus) {
                order.status = newStatus;
                order.status_timestamps[newStatus] = new Date();
                
                if (newStatus === 'delivered') {
                    order.delivery_info.delivered_at = new Date();
                }
                
                await order.save();
            }
        }
        
        res.json({
            success: true,
            data: tracking,
            order_status: order.status
        });
        
    } catch (error) {
        console.error('Error tracking shipment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track shipment',
            error: error.message
        });
    }
};

// Cancel shipment
const cancelShipment = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { reason } = req.body;
        
        const order = await Order.findById(order_id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        const shipmentId = order.delivery_info?.shiprocket_shipment_id;
        if (!shipmentId) {
            return res.status(400).json({
                success: false,
                message: 'No ShipRocket shipment found'
            });
        }
        
        // Cancel shipment in ShipRocket
        // Note: ShipRocket may have specific cancellation API endpoint
        // This is a placeholder - check ShipRocket API documentation
        const token = await ShipRocketService.getAuthToken();
        const response = await axios.post(
            'https://apiv2.shiprocket.in/v1/external/orders/cancel',
            {
                ids: [shipmentId],
                reason: reason || 'Customer request'
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        // Update order
        order.status = 'cancelled';
        order.delivery_info.shiprocket_status = 'cancelled';
        order.delivery_info.cancellation_reason = reason;
        await order.save();
        
        // Update all order items
        await OrderItem.updateMany(
            { order_id },
            { 
                active_status: 'cancelled',
                $push: {
                    status_history: {
                        status: 'cancelled',
                        timestamp: new Date(),
                        notes: `ShipRocket shipment cancelled: ${reason}`
                    }
                }
            }
        );
        
        res.json({
            success: true,
            message: 'Shipment cancelled successfully',
            data: response.data
        });
        
    } catch (error) {
        console.error('Error cancelling shipment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel shipment',
            error: error.message
        });
    }
};

module.exports ={
    cancelShipment,
    trackShipment,
    getShippingLabel,
    checkShippingServiceability,
    createShipRocketShipment

}