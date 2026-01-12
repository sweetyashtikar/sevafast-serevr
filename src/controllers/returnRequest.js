const approveReturn = async (requestId, adminRemarks) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Update Return Request
        const request = await ReturnRequest.findByIdAndUpdate(
            requestId,
            { status: 1, remarks: adminRemarks },
            { session, new: true }
        );

        // 2. Update the OrderItem status to 'Returned'
        await OrderItem.findByIdAndUpdate(
            request.order_item_id,
            { active_status: 'returned' },
            { session }
        );

        // 3. Optional: Add logic to restock the ProductVariant or initiate Wallet Refund

        await session.commitTransaction();
        return request;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};