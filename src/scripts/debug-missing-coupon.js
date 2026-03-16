const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8']);
require('dotenv').config();

async function debugCoupon() {
    try {
        await mongoose.connect(process.env.MONGODB);
        const Coupon = mongoose.connection.collection('coupons');
        const User = mongoose.connection.collection('users');
        
        const couponCode = 'REF-50-S7DR';
        const coupon = await Coupon.findOne({ couponCode: couponCode });
        
        if (!coupon) {
            console.log('--- COUPON NOT FOUND ---');
        } else {
            console.log('--- COUPON DATA ---');
            console.log(JSON.stringify(coupon, null, 2));
            
            if (coupon.userIds && coupon.userIds.length > 0) {
                const userId = coupon.userIds[0];
                console.log('--- USER DATA FOR ID:', userId, '---');
                const user = await User.findOne({ _id: userId });
                if (!user) {
                    // Try searching by string ID if it was stored as string
                    const userByStr = await User.findOne({ _id: new mongoose.Types.ObjectId(userId) });
                    console.log('User found by ObjectId cast:', !!userByStr);
                } else {
                    console.log('User found directly:', user.username);
                }
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
debugCoupon();
