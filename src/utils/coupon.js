// services/couponService.js
const Coupon = require('../models/coupons');
const Order = require('../models/orders');


const validateAndApplyCoupon = async (couponCode, userId, orderAmount, items = []) => {
        // Find coupon
        const coupon = await Coupon.findOne({ 
            couponCode: couponCode.toUpperCase(),
            status: true
        });

        if (!coupon) {
            throw new Error('Invalid coupon code');
        }

        // Check expiry
        const now = new Date();
        if (coupon.expiryDate < now) {
            throw new Error('Coupon has expired');
        }

        // Check start date
        if (coupon.startDate > now) {
            throw new Error('Coupon is not yet active');
        }

        // Check minimum order amount
        if (orderAmount < coupon.minOrderAmount) {
            throw new Error(`Minimum order amount of ₹${coupon.minOrderAmount} required`);
        }

        // Check total usage limit
        if (coupon.totalUsageLimit && coupon.totalUsedCount >= coupon.totalUsageLimit) {
            throw new Error('Coupon usage limit exceeded');
        }

        // Check user type
        if (coupon.userType === 'new') {
            const existingOrders = await Order.countDocuments({ user_id: userId });
            if (existingOrders > 0) {
                throw new Error('This coupon is only for new users');
            }
        } else if (coupon.userType === 'existing') {
            const existingOrders = await Order.countDocuments({ user_id: userId });
            if (existingOrders === 0) {
                throw new Error('This coupon is only for existing users');
            }
        }

        // Check per-user usage limit
        const userOrdersWithCoupon = await Order.countDocuments({
            user_id: userId,
            'promo_details.code': couponCode.toUpperCase()
        });

        if (userOrdersWithCoupon >= coupon.perUserUsageLimit) {
            throw new Error(`You can only use this coupon ${coupon.perUserUsageLimit} time(s)`);
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (orderAmount * coupon.couponValue) / 100;
            if (coupon.maxDiscountAmount) {
                discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
            }
        } else {
            discountAmount = Math.min(coupon.couponValue, orderAmount);
        }

        return {
            coupon,
            discountAmount,
            finalAmount: orderAmount - discountAmount
        };
    }

    const applyCouponToOrder = async (orderId, couponCode, userId, discountAmount)=> {
        // Update coupon usage count
        await Coupon.findOneAndUpdate(
            { couponCode: couponCode.toUpperCase() },
            { $inc: { totalUsedCount: 1 } }
        );

        // Update order with coupon details
        await Order.findByIdAndUpdate(orderId, {
            'promo_details.code': couponCode.toUpperCase(),
            'promo_details.discount': discountAmount,
            'promo_details.discount_type': 'fixed'
        });

        // You might also want to track coupon usage in a separate collection
        // await CouponUsage.create({...})
    }


module.exports = {applyCouponToOrder,validateAndApplyCoupon};