const mongoose = require('mongoose')

const STATUS = {
    NEW: 'new',
    CONTACTED: 'contacted',
    MEETING_SCHEDULED: 'meeting_scheduled',
    PROPOSAL_SENT: 'proposal_sent',
    NEGOTIATION: 'negotiation',
    CONVERTED: 'converted',
    LOST: 'lost'
}
const leadSchema = new mongoose.Schema({
    name: String,
    mobile: String,
    email: String,
    field_manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // Lead details
    status: {
        type: String,
        enum: Object.values(STATUS),
        default: "new",
    },

    // // Add these fields for website registration
    // registration_token: {
    //     type: String,
    //     unique: true,
    //     sparse: true // Allows multiple null values
    // },
    // registration_link: String,
    // token_expiry: Date,
    // registered_user_id: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "User"
    // },
    // registered_at: Date
});

// When field manager creates a lead, generate unique token
function generateRegistrationToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Create lead with registration token
// app.post('/api/field-manager/leads', async (req, res) => {
//     try {
//         const { name, phone, email } = req.body;
//         const fieldManagerId = req.user.id;

//         // Generate unique token
//         const token = generateRegistrationToken();

//         // Create registration link
//         const registrationLink = `${process.env.FRONTEND_URL}/register?token=${token}`;

//         const lead = new Lead({
//             name,
//             phone,
//             email,
//             field_manager: fieldManagerId,
//             registration_token: token,
//             registration_link: registrationLink,
//             token_expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
//         });

//         await lead.save();

//         // Send registration link to lead via SMS/Email
//         // await sendRegistrationLink(phone, registrationLink);

//         res.json({
//             message: "Lead created successfully",
//             registration_link: registrationLink
//         });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });


//CHECK IN THE USER REGITER CONTROLLER ABOUT THE LEAD EXISTS
// User Registration endpoint
// app.post('/api/register', async (req, res) => {
//   try {
//     const { username, email, mobile, password } = req.body;
    
//     // Check if user already exists
//     const existingUser = await User.findOne({ 
//       $or: [{ email }, { mobile }] 
//     });
    
//     if (existingUser) {
//       return res.status(400).json({ error: "User already exists" });
//     }
    
//     // Check if there's a lead with this phone/email
//     const lead = await Lead.findOne({
//       $and: [
//         { $or: [{ phone: mobile }, { email: email }] },
//         { status: { $in: ["pending", "scheduled", "gained"] } }
//       ]
//     });
    
//     // Create new user
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const user = new User({
//       username,
//       email,
//       mobile,
//       password: hashedPassword,
//       role: "customer", // Default role
//       status: true
//     });
    
//     // If lead exists, link them to the field manager
//     if (lead) {
//       user.field_manager_id = lead.field_manager;
//       user.lead_conversion_data = {
//         is_converted: true,
//         converted_at: new Date(),
//         source_lead_id: lead._id
//       };
      
//       // Update lead status
//       lead.status = "converted";
//       lead.registered_user_id = user._id;
//       lead.registered_at = new Date();
//       await lead.save();
//     }
    
//     await user.save();
    
//     res.json({ 
//       message: "Registration successful", 
//       linked_to_field_manager: !!lead 
//     });
    
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

const Lead = mongoose.model('Lead', leadSchema);

module.exports = { Lead, STATUS };