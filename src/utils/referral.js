const { default: mongoose } = require('mongoose');
const User = require('../models/User');
const Coupon = require('../models/coupons');

/**
 * Issues referral rewards to either a referrer (coupon) or a field manager (cash).
 * @param {string} userId - The ID of the newly approved user (invitee).
 * @param {object} session - Mongoose session (for transactions).
 */
const issueReferralReward = async (userId, existingSession = null) => {
    let session = existingSession;
    let isInternallyCreatedSession = false;

    try {
        const Wallet = require('../models/wallet');
        const WalletTransaction = require('../models/walletTransaction');
        
        if (!session) {
            session = await mongoose.startSession();
            session.startTransaction();
            isInternallyCreatedSession = true;
        }

        console.log(`[Referral] Checking for reward for invitee: ${userId}`);
        
        // 1. Find the invitee and atomically check-and-set the reward flag
        // This prevents race conditions if multiple triggers happen for the same user simultaneously
        const invitee = await User.findOneAndUpdate(
            { _id: userId, referral_reward_issued: { $ne: true } },
            { $set: { referral_reward_issued: true } },
            { session, new: true }
        );

        if (!invitee) {
            console.log(`[Referral] Reward already issued or user ${userId} not found. Skipping.`);
            if (isInternallyCreatedSession) await session.abortTransaction();
            return;
        }

        let rewardIssued = false;

        // --- PART A: Standard Referral (Referrer gets a coupon) ---
        if (invitee.friends_code) {
            const referrer = await User.findOne({ referral_code: invitee.friends_code }).session(session);
            if (referrer) {
                const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
                const couponCode = `REF-50-${randomSuffix}`;
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 30);

                const newCoupon = new Coupon({
                    couponCode: couponCode,
                    title: 'Referral Reward: 50% OFF',
                    description: `Thank you for referring a vendor! Use this code for 50% off your next order.`,
                    couponType: 'single time valid',
                    userType: 'all',
                    discountType: 'percentage',
                    couponValue: 50,
                    minOrderAmount: 0,
                    expiryDate: expiryDate,
                    userIds: [referrer._id],
                    status: true,
                    perUserUsageLimit: 1
                });

                await newCoupon.save({ session });
                console.log(`[Referral] Coupon ${couponCode} issued to referrer ${referrer.username}`);
                rewardIssued = true;
            }
        }

        // --- PART B: Field Manager Reward (FM gets ₹100 cash) ---
        if (invitee.field_manager) {
            const fmId = invitee.field_manager;
            
            // Credit FM wallet (hooks will sync to User.balance)
            // IMPORTANT: Increased both balance AND totalCashReceived
            await Wallet.findOneAndUpdate(
                { userId: fmId },
                { $inc: { balance: 100, totalCashReceived: 100 } },
                { upsert: true, session }
            );

            // Create transaction log
            await WalletTransaction.create([{
                user_id: fmId,
                type: 'credit',
                amount: 100,
                message: `Referral bonus for approved vendor: ${invitee.username}`,
                status: 'success'
            }], { session });

            console.log(`[Referral] ₹100 reward issued to Field Manager for user ${invitee.username}`);
            rewardIssued = true;
        }

        if (isInternallyCreatedSession) {
            await session.commitTransaction();
        }

        return true;

    } catch (error) {
        if (isInternallyCreatedSession && session) {
            await session.abortTransaction();
        }
        console.error("[Referral] Error issuing reward:", error);
    } finally {
        if (isInternallyCreatedSession && session) {
            session.endSession();
        }
    }
};

module.exports = { issueReferralReward };
