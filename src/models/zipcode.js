// const mongoose = require('mongoose');

// const zipcodeSchema = new mongoose.Schema({
//     // The postal code (Stored as string to preserve leading zeros if any)
//     zipcode: {
//         type: String,
//         required: true,
//         trim: true,
//         unique:true
//     }
// }, { 
//     // date_created
//     timestamps:  true  
// });

// // Index is critical here for checking delivery availability during checkout
// zipcodeSchema.index({ zipcode: 1 });

// module.exports = mongoose.model('Zipcode', zipcodeSchema);

// models/Zipcode.js
const mongoose = require('mongoose');

const zipcodeSchema = new mongoose.Schema({
    zipcode: {
        type: String,
        required: true,
        trim: true,
        unique: true, // This ensures NO redundancy - each zipcode exists once
        validate: {
            validator: function(v) {
                return /^\d{6}$/.test(v);
            },
            message: props => `${props.value} is not a valid 6-digit pincode!`
        }
    },
    // Reference to City - this creates the relationship
    city_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'City',
        required: true,
        index: true
    },
    // Additional zipcode-specific fields can go here
    is_deliverable: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Compound index for faster lookups
zipcodeSchema.index({ zipcode: 1, city_id: 1 });

module.exports = mongoose.model('Zipcode', zipcodeSchema);