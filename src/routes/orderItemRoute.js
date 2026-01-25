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
const {authenticate} = require('../middleware/authMiddleware');


//create order
router.post('/',authenticate,createOrderItem )

//bulk create order ITems
router.post('/bulk',bulkCreateOrderItems)

//get all order item
router.get('/', getAllOrderItems)

//get order Item by Id
router.get('/:id', getOrderItemById)

// 5. READ - Get order items by order ID
router.get('/:order_id', getOrderItemsByOrder)

// 6. UPDATE - Update order item status
router.put('/:id', updateOrderItemStatus)

// 7. UPDATE - Update order item details
router.put('/:id', updateOrderItem)

// 8. UPDATE - Mark commission as credited
router.put('/:id', markCommissionAsCredited)

// 9. DELETE - Cancel/remove order item
router.delete('/:id', cancelOrderItem)

// 10. ANALYTICS - Get seller performance
router.get('/:seller_id', getSellerPerformance)

//11. get all the order of the user
router.get('/:seller_id', getUserOrders)

//12. update order status
router.put('/:order_id', updateOrderStatus)

//13. ASSIGN DELIVERY BOY
router.post('/:order_id', assignDeliveryBoy)

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

module.exports = router