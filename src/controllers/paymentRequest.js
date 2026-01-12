const approvePayout = async (requestId, adminRemarks) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const request = await PaymentRequest.findById(requestId);
        
        if (request.status !== 0) throw new Error("Request already processed");

        // 1. Check user's balance (Assuming User model has a balance field)
        const user = await User.findById(request.user_id);
        if (user.balance < request.amount_requested) {
            throw new Error("Insufficient balance for this payout");
        }

        // 2. Deduct balance and update status
        user.balance -= request.amount_requested;
        await user.save({ session });

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