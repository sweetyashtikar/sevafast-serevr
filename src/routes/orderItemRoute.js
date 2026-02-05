const express = require('express');
const router = express.Router();
const {createOrderItem,
    bulkCreateOrderItems,
    getAllOrderItems,
    getOrderItemById,
    getOrderItemsByOrder,
    updateOrderItemStatus,
    updateOrderItem,
    getUserOrders,
    getOrderAnalytics,
    processRefund,
    getDeliveryBoyOrders,
    getSellerOrders,
    cancelOrder,
    updateOrderStatus,
    getSellerPerformance,
    cancelOrderItem,
    markCommissionAsCredited,
    assignDeliveryBoy,
    verifyDeliveryOTP
} = require('../controllers/orderItemController');
const {
     cancelShipment,
    trackShipment,
    getShippingLabel,
    checkShippingServiceability,
    createShipRocketShipment
} = require('../controllers/shiprocketController')
const {authenticate,authorizePermission} = require('../middleware/authMiddleware');


//create order
router.post('/',authenticate,createOrderItem ) // done

//bulk create order ITems
// router.post('/bulk',bulkCreateOrderItems)

//get all order item
router.get('/', getAllOrderItems)//done

//get order Item by Id
router.get('/:order_id', authenticate,getOrderItemById)//done

// 5. READ - Get order items by order ID
router.get('/OrderItem/:order_id', getOrderItemsByOrder)//done

// 6. UPDATE - Update order item status
router.put('/updateOrderItem/:id', updateOrderItemStatus)//done

// 7. UPDATE - Update order item details
router.put('/updateOrderItemDetails/:id', updateOrderItem)

// 8. UPDATE - Mark commission as credited
router.put('/:id', markCommissionAsCredited)

// 9. DELETE - Cancel/remove order item
router.patch('/order-item/:id/cancel',authenticate, cancelOrderItem);

// 10. ANALYTICS - Get seller performance
router.get('/:seller_id', getSellerPerformance)

//11. get all the order of the user
router.get('/User/my-orders', authenticate, getUserOrders);//done

//12. update order status
router.patch('/:order_id', updateOrderStatus)//done

//13. ASSIGN DELIVERY BOY
router.put('/assignDeliveryBoy/:order_id', assignDeliveryBoy)//done

//14. verify delivery otp
router.post('/:order_id',verifyDeliveryOTP)

//15. cancel orders
router.post('/:order_id',cancelOrder)

//16. get seller orders
router.get('/sellerOrders',getSellerOrders)

//17. get delivery boy orders
router.get('/deliveryBoys',getDeliveryBoyOrders)

//18. process refund
router.post('/processrefund',processRefund)

router.get('/orderAnalystics',getOrderAnalytics)

//shiprocket
// Check shipping serviceability
router.post('/shiprocket/check-shipping',
    authenticate,
    checkShippingServiceability
);

// Create ShipRocket shipment (admin only)
router.post('/shiprocket/:order_id/create-shipment',
    authenticate,
    authorizePermission("can_manage_products"),
    createShipRocketShipment
);

// Get shipping label
router.get('/shiprocket/:order_id/shipping-label',
    authenticate,
    getShippingLabel
);
// Track shipment
router.get('/shiprocket/:order_id/track',
    authenticate,
    trackShipment
);

// Cancel shipment
router.post('/:order_id/cancel-shipment',
    authenticate,
    authorizePermission('can_manage_products'),
    cancelShipment
);

module.exports = router