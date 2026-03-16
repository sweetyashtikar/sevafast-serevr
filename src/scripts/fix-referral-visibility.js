const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8']);
require('dotenv').config();

async function fixCoupons() {
    try {
        await mongoose.connect(process.env.MONGODB);
        const Coupon = mongoose.connection.collection('coupons');
        
        // Find all coupons starting with REF-50
        const result = await Coupon.updateMany(
            { couponCode: { $regex: '^REF-50-' } },
            { $set: { userType: 'all' } }
        );
        
        console.log('--- REPAIR COMPLETE ---');
        console.log(`Matched: ${result.matchedCount}`);
        console.log(`Modified: ${result.modifiedCount}`);
        
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
fixCoupons();
