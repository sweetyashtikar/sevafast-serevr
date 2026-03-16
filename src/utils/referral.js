const User = require('../models/User');
const Coupon = require('../models/coupons');

/**
 * Issues a referral reward coupon to the referrer of a newly approved vendor.
 * @param {string} userId - The ID of the newly approved user (invitee).
 * @param {object} session - Mongoose session (for transactions).
 */
const issueReferralReward = async (userId, session = null) => {
    try {
        console.log(`[Referral] Checking for reward for invitee: ${userId}`);
        
        // 1. Find the invitee and check if reward already issued
        const invitee = await User.findById(userId).session(session);
        if (!invitee || !invitee.friends_code) {
            console.log(`[Referral] No referral code found for user ${userId}`);
            return;
        }

        if (invitee.referral_reward_issued) {
            console.log(`[Referral] Reward already issued for user ${userId}. Skipping.`);
            return;
        }

        // 2. Find the referrer
        const referrer = await User.findOne({ referral_code: invitee.friends_code }).session(session);
        if (!referrer) {
            console.log(`[Referral] Referrer not found for code: ${invitee.friends_code}`);
            return;
        }

        // 3. Generate a unique 50% discount coupon
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const couponCode = `REF-50-${randomSuffix}`;
        
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30); // Valid for 30 days

        const newCoupon = new Coupon({
            couponCode: couponCode,
            title: 'Referral Reward: 50% OFF',
            description: `Thank you for referring a vendor! Use this code for 50% off your next order.`,
            couponType: 'single time valid',
            userType: 'all',
            discountType: 'percentage',
            couponValue: 50,
            minOrderAmount: 0,
            maxDiscountAmount: null, // No cap
            expiryDate: expiryDate,
            userIds: [referrer._id],
            status: true,
            perUserUsageLimit: 1
        });

        if (session) {
            await newCoupon.save({ session });
            await User.findByIdAndUpdate(userId, { referral_reward_issued: true }).session(session);
        } else {
            await newCoupon.save();
            await User.findByIdAndUpdate(userId, { referral_reward_issued: true });
        }

        console.log(`[Referral] Reward coupon ${couponCode} issued to referrer ${referrer.username} (${referrer._id})`);
        return newCoupon;

    } catch (error) {
        console.error("[Referral] Error issuing reward:", error);
        // We don't throw to avoid breaking the main flow (e.g. user approval)
    }
};

module.exports = { issueReferralReward };
