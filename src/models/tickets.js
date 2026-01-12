const mongoose = require('mongoose');

const Status = {
    PENDING: "pending",
    OPEN: "open",
    RESOLVED: "resolved",
    CLOSED: "closed",
    REOPENED: "reopened"
}

const ticketSchema = new mongoose.Schema({
    // Reference to the Ticket Category (e.g., Billing, Technical, Feedback)
    ticket_type_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TicketType',
        required: true
    },
    // The user who opened the ticket
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    // Status (0: Pending, 1: Open, 2: Resolved, 3: Closed, 5: Re-opened)
    status: {
        type: String,
        enum: [Status.PENDING, Status.OPEN, Status.RESOLVED, Status.CLOSED, Status.REOPENED],
        default: Status.PENDING
    },
    // Optional: Nesting the conversation thread
    messages: [{
        sender_role: { type: String, enum: ['user', 'admin'] },
        message: String,
        date_sent: { type: Date, default: Date.now }
    }]
}, { 
    // last_updated and date_created
    timestamps: { createdAt: 'date_created', updatedAt: 'last_updated' } 
});

// Indexes for the Support Dashboard
ticketSchema.index({ status: 1});
ticketSchema.index({ user_id: 1 });
ticketSchema.index({ date_created: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);