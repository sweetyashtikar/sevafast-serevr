// controllers/notificationController.js
const {
  CustomNotification,
  DeliveryBoyNotification,
  Notification,
  SystemNotification
} = require('../models/notification');

// Create custom notification
exports.createCustomNotification = async (req, res) => {
  try {
    const notification = new CustomNotification(req.body);
    await notification.save();
    
    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get notifications for delivery boy
exports.getDeliveryBoyNotifications = async (req, res) => {
  try {
    const { delivery_boy_id, page = 1, limit = 20 } = req.query;
    
    const notifications = await DeliveryBoyNotification
      .find({ delivery_boy_id })
      .sort({ date_created: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('order_id', 'order_number customer_name total_amount')
      .populate('delivery_boy_id', 'name phone email');
    
    const total = await DeliveryBoyNotification.countDocuments({ delivery_boy_id });
    
    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create system notification
exports.createSystemNotification = async (req, res) => {
  try {
    const { title, message, type, type_id = 0, target_role = 'all' } = req.body;
    
    const notification = new SystemNotification({
      title,
      message,
      type,
      type_id,
      target_role
    });
    
    await notification.save();
    
    // Emit socket event for real-time notification
    if (req.io) {
      req.io.emit('system_notification', notification);
    }
    
    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notification_id, user_id } = req.body;
    
    const notification = await Notification.findById(notification_id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
    
    // Check if already read
    const alreadyRead = notification.read_by.some(
      read => read.user_id.toString() === user_id
    );
    
    if (!alreadyRead) {
      notification.read_by.push({
        user_id,
        read_at: Date.now()
      });
      
      await notification.save();
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get unread notifications count
exports.getUnreadCount = async (req, res) => {
  try {
    const { user_id, user_role } = req.query;
    
    let count = 0;
    
    if (user_role === 'delivery_boy') {
      count = await DeliveryBoyNotification.countDocuments({
        delivery_boy_id: user_id,
        is_read: false
      });
    } else {
      count = await Notification.countDocuments({
        $or: [
          { target_users: user_id },
          { is_broadcast: true }
        ],
        read_by: { 
          $not: { 
            $elemMatch: { user_id } 
          } 
        }
      });
    }
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};