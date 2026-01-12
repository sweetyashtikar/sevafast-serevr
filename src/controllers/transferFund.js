const transferFunds = async (req, res) => {
    const { delivery_boy_id, amount, message } = req.body;

    try {
        // 1. Get the current balance of the delivery boy from the User model
        const user = await User.findById(delivery_boy_id);
        const openingBalance = user.cash_collected; // Assuming this field exists in User

        // 2. Calculate new balance
        const closingBalance = openingBalance - amount;

        // 3. Create the transfer record
        const transfer = await FundTransfer.create({
            delivery_boy_id,
            opening_balance: openingBalance,
            closing_balance: closingBalance,
            amount,
            status: 'success',
            message
        });

        // 4. Update the User's current cash balance
        user.cash_collected = closingBalance;
        await user.save();

        res.status(201).json({ success: true, transfer });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};