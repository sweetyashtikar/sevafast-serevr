const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Standard User Fields
   user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null
      },    
    // Instead of a separate users_groups table, we use an array here
    group_id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }]
}, { 
    timestamps: true
});

// Index the groups array for fast searching (e.g., Find all Admins)
userSchema.index({ group_id: 1 });

module.exports = mongoose.model('User', userSchema);