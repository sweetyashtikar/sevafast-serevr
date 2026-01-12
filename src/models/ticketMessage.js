// under consediration

// const mongoose = require('mongoose');

// const ticketMessageSchema = new mongoose.Schema({
//     // Reference to the main Ticket document
//     ticket_id: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Ticket',
//         required: true
//     },
//     // The sender (Admin ID or User ID)
//     user_id: {
//         type: mongoose.Schema.Types.ObjectId,
//         refPath: 'user_type_ref', // Dynamic ref: looks at User or Admin collection
//         required: true
//     },
//     // Used for dynamic population
//     user_type_ref: {
//         type: String,
//         required: true,
//         enum: ['User', 'Admin'], // Map 'user' -> 'User', 'admin' -> 'Admin'
//         default: 'User'
//     },
//     message: {
//         type: String,
//         trim: true,
//         default: ""
//     },
//     // Native array of strings for image/zip paths
//     attachments: [{
//         type: String,
//         trim: true
//     }]
// }, { 
//     // date_created and last_updated
//     timestamps: { createdAt: 'date_created', updatedAt: 'last_updated' } 
// });

// // Index to fetch the conversation thread in order
// ticketMessageSchema.index({ ticket_id: 1, date_created: 1 });

// module.exports = mongoose.model('TicketMessage', ticketMessageSchema);