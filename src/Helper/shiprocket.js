const createShipRocketShipmentInBackground = async (orderId, user, userAddress, items) => {
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        // Check if already has ShipRocket shipment
        if (order.delivery_info?.shiprocket_shipment_id) {
            console.log('Order already has ShipRocket shipment');
            return;
        }

        // Prepare ShipRocket order data
        const shiprocketOrderData = {
            order_id: order.order_number || `ORD-${order._id}`,
            order_date: new Date().toISOString().split('T')[0],
            pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
            channel_id: process.env.SHIPROCKET_CHANNEL_ID || '',
            comment: 'Order from e-commerce store',
            billing_customer_name: user.name || user.username,
            billing_last_name: '',
            billing_address: userAddress.address,
            billing_address_2: userAddress.address2 || '',
            billing_city: userAddress.city_id?.name || userAddress.city,
            billing_pincode: userAddress.pincode,
            billing_state: userAddress.state,
            billing_country: 'India',
            billing_email: user.email,
            billing_phone: user.phone || userAddress.mobile,
            shipping_is_billing: true,
            order_items: items.map(item => ({
                name: item.product_name,
                sku: item.product_id,
                units: item.quantity,
                selling_price: item.price,
                discount: item.discount || '',
                tax: item.tax_amount || '',
                hsn: 441122 // You should get actual HSN from product
            })),
            payment_method: order.payment.method === 'cod' ? 'COD' : 'Prepaid',
            sub_total: order.total,
            length: 15,
            breadth: 15,
            height: 15,
            weight: order.delivery_info?.shiprocket_data?.weight || 0.5
        };

        // Create shipment
        const shipment = await ShipRocketService.createOrder(shiprocketOrderData);
        
        // Update order with ShipRocket data
        order.delivery_info.shiprocket_shipment_id = shipment.shipment_id;
        order.delivery_info.shiprocket_awb_number = shipment.awb_code;
        order.delivery_info.shiprocket_status = shipment.status;
        order.delivery_info.shiprocket_response = shipment;
        
        await order.save();
        
        console.log(`ShipRocket shipment created: ${shipment.shipment_id}`);
        
        // Generate label
        try {
            const label = await ShipRocketService.generateLabel(shipment.shipment_id);
            if (label.label_url) {
                order.delivery_info.shiprocket_label_url = label.label_url;
                await order.save();
            }
        } catch (labelError) {
            console.warn('Failed to generate label:', labelError.message);
        }
        
    } catch (error) {
        console.error('Error creating ShipRocket shipment:', error);
        // Update order with error
        await Order.findByIdAndUpdate(orderId, {
            $set: {
                'delivery_info.shiprocket_error': error.message,
                'delivery_info.shiprocket_status': 'failed'
            }
        });
    }
};

module.exports = {
    createShipRocketShipmentInBackground
}