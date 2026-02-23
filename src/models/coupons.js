// models/Coupon.js
const mongoose = require('mongoose');

const CouponType = {
    SINGLE_TIME: 'single time valid',
    MULTIPLE_TIME: 'multiple time valid'
};

const DiscountType = {
    PERCENTAGE: 'percentage',
    FIXED: 'fixed'
};

const UserType = {
    ALL: 'all',
    NEW: 'new',
    EXISTING: 'existing'
};

const couponSchema = new mongoose.Schema({
    // Basic Information
    couponCode: {
        type: String,
        required: [true, 'Coupon code is required'],
        unique: true,
        uppercase: true,
        trim: true,
        index: true
    },
    title: {
        type: String,
        required: [true, 'Coupon title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Coupon description is required'],
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },

    // Coupon Configuration
    couponType: {
        type: String,
        required: [true, 'Coupon type is required'],
        enum: Object.values(CouponType),
        default: CouponType.SINGLE_TIME
    },

    userType: {
        type: String,
        required: [true, 'User type is required'],
        enum: Object.values(UserType),
        default: UserType.ALL
    },

    // Discount Details
    discountType: {
        type: String,
        required: [true, 'Discount type is required'],
        enum: Object.values(DiscountType),
        default: DiscountType.PERCENTAGE
    },

    couponValue: {
        type: Number,
        required: [true, 'Coupon value is required'],
        min: [0, 'Coupon value cannot be negative']
    },

    minOrderAmount: {
        type: Number,
        required: [true, 'Minimum order amount is required'],
        min: [0, 'Minimum order amount cannot be negative'],
        default: 0
    },

    maxDiscountAmount: {
        type: Number,
        min: [0, 'Max discount amount cannot be negative'],
        default: null // null means no limit
    },

    // Validity
    expiryDate: {
        type: Date,
        required: [true, 'Expiry date is required'],
        index: true
    },

    startDate: {
        type: Date,
        default: Date.now,
        index: true
    },

    // Usage Limits
    totalUsageLimit: {
        type: Number,
        default: null, // null means unlimited
        min: [1, 'Total usage limit must be at least 1']
    },

    perUserUsageLimit: {
        type: Number,
        default: 1,
        min: [1, 'Per user usage limit must be at least 1']
    },

    totalUsedCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // Status
    status: {
        type: Boolean,
        default: true,
        index: true
    },

    // Image/File
    image: {
        type: String,
        default: null
    },

    // Applicable Products/Categories (Optional)
    // applicableProducts: [{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Product'
    // }],

    // applicableCategories: [{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Category'
    // }],

    // Excluded Products/Categories (Optional)
    // excludedProducts: [{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Product'
    // }],

    // excludedCategories: [{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Category'
    // }],

    // User-specific restrictions (for single time valid)
    // userIds: [{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'User'
    // }],

    // Usage tracking
    // usedBy: [{
    //     user_id: {
    //         type: mongoose.Schema.Types.ObjectId,
    //         ref: 'User'
    //     },
    //     order_id: {
    //         type: mongoose.Schema.Types.ObjectId,
    //         ref: 'Order'
    //     },
    //     used_at: {
    //         type: Date,
    //         default: Date.now
    //     },
    //     discount_amount: Number
    // }],

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound indexes for efficient querying
couponSchema.index({ status: 1, expiryDate: 1 });
couponSchema.index({ couponCode: 1, status: 1 });
couponSchema.index({ startDate: 1, expiryDate: 1 });

// Virtual for checking if coupon is expired
couponSchema.virtual('isExpired').get(function() {
    return this.expiryDate < new Date();
});

// Virtual for checking if coupon is active and valid
couponSchema.virtual('isValid').get(function() {
    const now = new Date();
    return this.status && 
           this.startDate <= now && 
           this.expiryDate >= now &&
           (this.totalUsageLimit === null || this.totalUsedCount < this.totalUsageLimit);
});

// Virtual for remaining uses
couponSchema.virtual('remainingUses').get(function() {
    if (this.totalUsageLimit === null) return 'Unlimited';
    return Math.max(0, this.totalUsageLimit - this.totalUsedCount);
});

// Pre-save middleware
couponSchema.pre('save', function(next) {
    // Validate dates
    if (this.expiryDate < this.startDate) {
        next(new Error('Expiry date cannot be before start date'));
    }

    // Ensure coupon code is uppercase
    if (this.couponCode) {
        this.couponCode = this.couponCode.toUpperCase();
    }

    // Validate percentage discount
    if (this.discountType === DiscountType.PERCENTAGE && this.couponValue > 100) {
        next(new Error('Percentage discount cannot exceed 100%'));
    }
});

// Method to check if coupon is applicable for a user
couponSchema.methods.isApplicableForUser = function(userId) {
    // If it's single time valid and has specific users
    if (this.couponType === CouponType.SINGLE_TIME && this.userIds && this.userIds.length > 0) {
        return this.userIds.includes(userId.toString());
    }
    
    // Check user type restrictions
    if (this.userType !== 'all') {
        // You'll need to implement logic to check if user is new/existing
        // This might require additional user data
        return true; // Placeholder
    }
    
    return true;
};

// Method to check if coupon can be used by a user (based on per-user limit)
couponSchema.methods.canUserUse = function(userId) {
    const userUses = this.usedBy.filter(use => use.user_id.toString() === userId.toString()).length;
    return userUses < this.perUserUsageLimit;
};

// Method to apply coupon
couponSchema.methods.applyCoupon = async function(userId, orderAmount, orderId) {
    if (!this.isValid) {
        throw new Error('Coupon is not valid');
    }

    if (!this.isApplicableForUser(userId)) {
        throw new Error('Coupon is not applicable for this user');
    }

    if (!this.canUserUse(userId)) {
        throw new Error('User has exceeded usage limit for this coupon');
    }

    if (orderAmount < this.minOrderAmount) {
        throw new Error(`Minimum order amount of ${this.minOrderAmount} is required`);
    }

    // Calculate discount
    let discountAmount = 0;
    if (this.discountType === DiscountType.PERCENTAGE) {
        discountAmount = (orderAmount * this.couponValue) / 100;
        if (this.maxDiscountAmount) {
            discountAmount = Math.min(discountAmount, this.maxDiscountAmount);
        }
    } else {
        discountAmount = Math.min(this.couponValue, orderAmount);
    }

    return discountAmount;
};

module.exports = mongoose.model('Coupon', couponSchema);