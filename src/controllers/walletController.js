const mongoose = require('mongoose');
const Wallet = require('../models/wallet');
const WalletTransaction = require('../models/walletTransaction');
const UserSubscription = require('../models/userSubscription');
const VendorLevel = require('../models/vendorLevel');
const Seller = require('../models/seller');
const OrderItem = require('../models/orderItem');

/**
 * GET /api/wallet/me
 * Returns the current user's wallet, plus their current vendor level if applicable.
 */
const getMyWallet = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;

        // Get or create wallet atomically
        const wallet = await Wallet.findOneAndUpdate(
            { userId },
            { $setOnInsert: { userId } },
            { upsert: true, new: true, session }
        );

        // Get recent transactions
        const transactions = await WalletTransaction.find({ user_id: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .session(session);

        // Calculate totalCashReceived from sum of all successful credit transactions
        const cashReceivedAgg = await WalletTransaction.aggregate([
            { $match: { user_id: userId, type: 'credit', status: 'success' } },
            { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } }
        ]).session(session);

        const totalCashReceived = cashReceivedAgg[0]?.total || 0;

        // Sync wallet.totalCashReceived if out of date
        if (wallet.totalCashReceived !== totalCashReceived) {
            await Wallet.findByIdAndUpdate(wallet._id, { totalCashReceived }, { session });
        }

        await session.commitTransaction();

        // Attempt to find the vendor's current level info
        let currentLevelInfo = null;

        const user = await mongoose.model('User').findById(userId).populate('role');
        const isFieldManager = user.role?.role === 'field_manager';

        console.log(`[Wallet] User ID: ${userId}, Role: ${user.role?.role}, isFieldManager: ${isFieldManager}`);

        if (!isFieldManager) {
            const vendorSub = await UserSubscription.findOne({
                userId,
                status: 'active',
                endDate: { $gt: new Date() }
            }).populate('subscriptionId');

            if (vendorSub && vendorSub.subscriptionId?.type === 'vendor') {
                const levels = await VendorLevel.find({
                    subscriptionId: vendorSub.subscriptionId._id,
                    isActive: true
                }).sort({ salesThreshold: 1 });

                // Prefer Seller record if exists, otherwise sum from OrderItems
                const seller = await Seller.findOne({ user_id: userId });
                let currentVolume = seller?.totalSalesVolume || 0;

                if (!currentVolume) {
                    // Fallback: sum sub_totals from all order items for this seller
                    const volumeAgg = await OrderItem.aggregate([
                        { $match: { seller_id: userId } },
                        { $group: { _id: null, total: { $sum: '$sub_total' } } }
                    ]);
                    currentVolume = volumeAgg[0]?.total || 0;
                }

                let currentLevel = null;
                let nextLevel = null;

                for (let i = 0; i < levels.length; i++) {
                    if (currentVolume >= levels[i].salesThreshold) {
                        currentLevel = levels[i];
                    } else {
                        nextLevel = levels[i];
                        break;
                    }
                }

                currentLevelInfo = {
                    currentVolume,
                    currentLevel: currentLevel ? {
                        levelName: currentLevel.levelName,
                        cashbackPercentage: currentLevel.cashbackPercentage,
                        salesThreshold: currentLevel.salesThreshold
                    } : null,
                    nextLevel: nextLevel ? {
                        levelName: nextLevel.levelName,
                        cashbackPercentage: nextLevel.cashbackPercentage,
                        salesThreshold: nextLevel.salesThreshold,
                        remaining: Math.max(0, nextLevel.salesThreshold - currentVolume)
                    } : null,
                    subscriptionName: vendorSub.subscriptionId.name
                };
            }
        }

        const response = {
            balance: wallet.balance,
            totalCashReceived: totalCashReceived,
            transactions
        };

        if (currentLevelInfo) {
            response.levelInfo = currentLevelInfo;
        }


        return res.status(200).json({
            success: true,
            data: response
        });
    } catch (err) {
        if (session) await session.abortTransaction();
        console.error('getMyWallet error:', err);
        return res.status(500).json({ success: false, message: err.message });
    } finally {
        if (session) session.endSession();
    }
};

/**
 * GET /api/wallet/transactions
 * Returns the current user's wallet transactions with pagination.
 */
const getTransactions = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const transactions = await WalletTransaction.find({ user_id: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await WalletTransaction.countDocuments({ user_id: userId });

        return res.status(200).json({
            success: true,
            data: {
                transactions,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (err) {
        console.error('getTransactions error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getMyWallet, getTransactions };
