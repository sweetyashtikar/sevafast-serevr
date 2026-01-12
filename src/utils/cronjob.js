const cron = require('node-cron');
const LoginAttempt = require("../models/LoginAttempt");

// Run at midnight every day
cron.schedule('0 0 * * *', async () => {
    try {
        // Delete attempts older than 24 hours
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const result = await LoginAttempt.deleteMany({ 
            time: { $lt: cutoff } 
        });
        
        console.log(`Cleaned ${result.deletedCount} old login attempts`);
    } catch (error) {
        console.error('Cleanup error:', error);
    }
});

console.log('Login cleanup scheduled: 12:00 AM daily');