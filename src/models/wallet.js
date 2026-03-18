const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    balance: {
        type: Number,
        default: 0,
        min: 0
    },
    totalCashReceived: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

// Static helper to get or create wallet for a user
walletSchema.statics.getOrCreate = async function(userId) {
    let wallet = await this.findOne({ userId });
    if (!wallet) {
        wallet = await this.create({ userId });
    }
    return wallet;
};

// Sync balance back to User model after any save
walletSchema.post('save', async function(doc) {
    try {
        const User = mongoose.model('User');
        await User.findByIdAndUpdate(doc.userId, {
            balance: doc.balance,
            cash_received: doc.totalCashReceived
        });
    } catch (error) {
        console.error('Error syncing wallet to user:', error);
    }
});

// Sync balance back to User model after findOneAndUpdate
walletSchema.post('findOneAndUpdate', async function(doc) {
    if (doc) {
        try {
            const User = mongoose.model('User');
            // We fetch the latest wallet state to be sure
            const updatedWallet = await mongoose.model('Wallet').findById(doc._id);
            if (updatedWallet) {
                await User.findByIdAndUpdate(updatedWallet.userId, {
                    balance: updatedWallet.balance,
                    cash_received: updatedWallet.totalCashReceived
                });
            }
        } catch (error) {
            console.error('Error syncing wallet to user on update:', error);
        }
    }
});

module.exports = mongoose.model('Wallet', walletSchema);
