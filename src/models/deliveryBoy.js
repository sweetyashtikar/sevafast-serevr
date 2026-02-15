// models/DeliveryBoy.js
const mongoose = require('mongoose');

const deliveryBoySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  vendor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Personal Details
  personal_details: {
    alternate_mobile: String,
    profile_image: String,
    date_of_birth: Date,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: String,
      coordinates: [Number]
    }
  },
  
  // Identity Verification
  verification: {
    aadhar_number: { type: String, sparse: true },
    aadhar_verified: { type: Boolean, default: false },
    aadhar_front_image: String,
    aadhar_back_image: String,
    
    pan_number: { type: String, sparse: true },
    pan_verified: { type: Boolean, default: false },
    pan_image: String,
    
    driving_license: {
      license_number: String,
      verified: { type: Boolean, default: false },
      front_image: String,
      back_image: String,
      expiry_date: Date
    },
    
    background_check: {
      status: { type: String, enum: ['pending', 'cleared', 'rejected'], default: 'pending' },
      report_url: String,
      verified_on: Date
    }
  },
  
  // Employment Details
  employment: {
    employee_id: String,
    joining_date: { type: Date, default: Date.now },
    employment_type: { 
      type: String, 
      enum: ['full_time', 'part_time', 'contract'], 
      default: 'full_time' 
    },
    salary_type: { type: String, enum: ['fixed', 'per_delivery', 'commission'], default: 'per_delivery' },
    salary_amount: { type: Number, default: 0 },
    commission_per_delivery: { type: Number, default: 30 },
    status: { type: Boolean, default: true }
  },
  
  // Vehicle Details
  vehicle: {
    type: { type: String, enum: ['bike', 'scooter', 'cycle', 'car', 'walk'] },
    number: String,
    model: String,
    color: String,
    insurance_expiry: Date,
    rc_image: String,
    is_verified: { type: Boolean, default: false }
  },
  
  // Bank Details
  bank_details: {
    account_holder: String,
    account_number: { type: String, select: false },
    ifsc_code: String,
    bank_name: String,
    branch: String,
    upi_id: String,
    verified: { type: Boolean, default: false }
  },
  
  // Performance Stats
  performance: {
    total_deliveries: { type: Number, default: 0 },
    successful_deliveries: { type: Number, default: 0 },
    failed_deliveries: { type: Number, default: 0 },
    cancelled_deliveries: { type: Number, default: 0 },
    avg_delivery_time: { type: Number, default: 0 }, // in minutes
    avg_rating: { type: Number, default: 0, min: 0, max: 5 },
    total_earnings: { type: Number, default: 0 },
    total_payouts: { type: Number, default: 0 },
    current_balance: { type: Number, default: 0 }
  },
  
  // Availability & Location
  availability: {
    is_available: { type: Boolean, default: false },
    current_location: {
      type: { type: String, default: 'Point' },
      coordinates: [Number],
      last_updated: { type: Date, default: Date.now }
    },
    online_since: Date,
    offline_since: Date,
    serviceable_zones: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zipcode'
    }],
    max_delivery_limit: { type: Number, default: 5 }, 
  },
  
  // Working Schedule
  schedule: [{
    day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
    start_time: String,
    end_time: String,
    is_working: { type: Boolean, default: true }
  }],
  
  // Documents
  documents: [{
    type: { type: String },
    url: String,
    verified: { type: Boolean, default: false },
    uploaded_at: { type: Date, default: Date.now },
    verified_at: Date
  }],
  
  // Ratings & Reviews
  ratings: [{
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    review: String,
    created_at: { type: Date, default: Date.now }
  }],
  
  // Payout History
  payouts: [{
    amount: Number,
    status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
    transaction_id: String,
    processed_at: Date,
    remarks: String
  }],
  
  // Notes/Tags
  tags: [String],
  notes: String
}, {
  timestamps: true
});

// Indexes
deliveryBoySchema.index({ vendor_id: 1, 'employment.is_active': 1 });
deliveryBoySchema.index({ 'availability.current_location': '2dsphere' });
deliveryBoySchema.index({ 'performance.avg_rating': -1 });

deliveryBoySchema.methods.getCurrentDeliveries = async function() {
  const Order = mongoose.model('Order');
  
  return await Order.find({
    'delivery_info.boy_id': this.user_id,
    status: { $in: ['assigned', 'picked_up', 'shipped'] }
  }).select('order_number status delivery_info.delivered_at');
};

module.exports = mongoose.model('DeliveryBoy', deliveryBoySchema);

