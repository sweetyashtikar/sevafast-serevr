// models/NotificationEnhanced.js
const mongoose = require('mongoose');

// 1. Custom Notification Schema with indexes
const customNotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    maxlength: [128, 'Title cannot exceed 128 characters'],
    index: true
  },
  message: {
    type: String,
    trim: true,
    maxlength: [512, 'Message cannot exceed 512 characters']
  },
  type: {
    type: String,
    trim: true,
    maxlength: [64, 'Type cannot exceed 64 characters'],
    index: true,
    enum: ['info', 'warning', 'success', 'error', 'promotion', 'alert'] // Add your types
  },
  date_sent: {
    type: Date,
    default: Date.now,
    index: true
  },
  is_read: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'date_sent', updatedAt: 'updated_at' },
  collection: 'custom_notifications'
});

// 2. Delivery Boy Notification Schema
const deliveryBoyNotificationSchema = new mongoose.Schema({
  delivery_boy_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming User model with role 'delivery_boy'
    required: [true, 'Delivery boy ID is required'],
    index: true
  },
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    trim: true,
    maxlength: [56, 'Type cannot exceed 56 characters'],
    enum: [
      'order_assigned',
      'order_picked',
      'order_delivered',
      'order_cancelled',
      'payment_received',
      'rating_received',
      'new_message'
    ]
  },
  is_read: {
    type: Boolean,
    default: false
  },
  date_created: {
    type: Date,
    default: Date.now,
    index: true
  },
  action_url: {
    type: String,
    default: null
  }
}, {
  timestamps: { createdAt: 'date_created', updatedAt: 'updated_at' },
  collection: 'delivery_boy_notifications'
});

// 3. General Notification Schema
const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [128, 'Title cannot exceed 128 characters'],
    index: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [512, 'Message cannot exceed 512 characters']
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    trim: true,
    maxlength: [12, 'Type cannot exceed 12 characters'],
    index: true,
    enum: [
      'user',
      'admin',
      'system',
      'order',
      'payment',
      'delivery',
      'promotion'
    ]
  },
  type_id: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    index: true
  },
  image: {
    type: String,
    trim: true,
    maxlength: [128, 'Image URL cannot exceed 128 characters'],
    default: null
  },
  target_users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  is_broadcast: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  expires_at: {
    type: Date,
    default: null
  },
  date_sent: {
    type: Date,
    default: Date.now,
    index: true
  },
  read_by: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    read_at: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: { createdAt: 'date_sent', updatedAt: 'updated_at' },
  collection: 'notifications'
});

// 4. System Notification Schema
const systemNotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [256, 'Title cannot exceed 256 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [256, 'Message cannot exceed 256 characters']
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    trim: true,
    index: true
  },
  type_id: {
    type: Number,
    default: 0,
    index: true
  },
  read_by: {
    type: Number,
    default: 0,
    min: [0, 'Read count cannot be negative'],
    get: v => Math.round(v),
    set: v => Math.round(v)
  },
  target_role: {
    type: String,
    enum: ['admin', 'user', 'delivery_boy', 'vendor', 'all'],
    default: 'all'
  },
  date_sent: {
    type: Date,
    default: Date.now,
    index: true
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: { createdAt: 'date_sent', updatedAt: 'updated_at' },
  collection: 'system_notifications'
});

// Add indexes for better performance
customNotificationSchema.index({ type: 1, date_sent: -1 });
deliveryBoyNotificationSchema.index({ delivery_boy_id: 1, is_read: 1, date_created: -1 });
notificationSchema.index({ type: 1, is_broadcast: 1, date_sent: -1 });
systemNotificationSchema.index({ type: 1, target_role: 1, date_sent: -1 });

// Export all models
module.exports = {
  CustomNotification: mongoose.model('CustomNotification', customNotificationSchema),
  DeliveryBoyNotification: mongoose.model('DeliveryBoyNotification', deliveryBoyNotificationSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  SystemNotification: mongoose.model('SystemNotification', systemNotificationSchema)
};