const mongoose = require('mongoose');
const User = require('../models/User');
const Wallet = require('../models/wallet');
const PaymentRequest = require('../models/paymentRequest'); // Assuming this exists based on usage

const approvePayout = async (requestId, adminRemarks) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const WalletTransaction = require('../models/walletTransaction');
        const request = await PaymentRequest.findById(requestId);
        
        if (request.status !== 0) throw new Error("Request already processed");

        // 1. Check user's wallet balance
        const wallet = await Wallet.getOrCreate(request.user_id);
        if (wallet.balance < request.amount_requested) {
            throw new Error("Insufficient balance for this payout");
        }

        // 2. Deduct balance from Wallet
        wallet.balance -= request.amount_requested;
        await wallet.save({ session });
        // Note: Wallet post-save hook will automatically update User.balance

        // 3. Log the Debit Transaction
        const transaction = new WalletTransaction({
            user_id: request.user_id,
            type: 'debit',
            amount: request.amount_requested,
            message: `Payout for request #${request._id}`,
            status: 'success'
        });
        await transaction.save({ session });

        request.status = 1; // Approved
        request.remarks = adminRemarks;
        await request.save({ session });

        await session.commitTransaction();
        return { success: true, message: "Payout approved and balance updated" };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

module.exports = { approvePayout };