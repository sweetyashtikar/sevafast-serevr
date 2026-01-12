const createOrderNotification = async (orderId, adminId) => {
    const notification = await SystemNotification.create({
        user_id: adminId,
        title: `New Order ID #${orderId}`,
        message: "New order received. Please process it.",
        type: "place_order",
        type_id: orderId,
        type_id_ref: "Order"
    });

    // Optional: Emit event via Socket.io for real-time dashboard updates
    // io.to(adminId).emit('notification', notification);
    
    return notification;
};