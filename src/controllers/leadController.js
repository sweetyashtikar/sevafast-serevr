// controllers/leadController.js
const {Lead, STATUS} = require('../models/leads');
const User = require('../models/User');
const crypto = require('crypto');


// Helper function to generate unique registration token
const generateRegistrationToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// @desc    Create a new lead (Field Manager)
// @route   POST /api/leads
// @access  Private (Field Manager only)
const createLead = async (req, res) => {
    try {
        const { name, mobile, email, status = 'new' } = req.body;
        console.log("req.body", req.body)
        const fieldManagerId = req.user._id; 

        console.log("fieldManagerId",fieldManagerId)

        // Check if lead with this mobile/email already exists for this field manager
        const existingLead = await Lead.findOne({
            field_manager: fieldManagerId,
            $or: [{ mobile }, { email }]
        });

        if (existingLead) {
            return res.status(400).json({
                success: false,
                message: 'Lead with this mobile or email already exists'
            });
        }

        // Generate unique registration token and link
        // const token = generateRegistrationToken();
        // const registrationLink = `${process.env.FRONTEND_URL}/register?token=${token}&fm=${fieldManagerId}`;

        const lead = new Lead({
            name,
            mobile,
            email,
            field_manager: fieldManagerId,
            status,
            // registration_token: token,
            // registration_link: registrationLink,
            // token_expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
        });

        await lead.save();

        res.status(201).json({
            success: true,
            message: 'Lead created successfully',
            data: {
                lead
            }
        });

    } catch (error) {
        console.error('Create lead error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating lead',
            error: error.message
        });
    }
};

// @desc    Get all leads for a field manager
// @route   GET /api/leads
// @access  Private (Field Manager only)
const getLeads = async (req, res) => {
    try {
        const fieldManagerId = req.user._id;
        const { status, page = 1, limit = 10, search } = req.query;
        console.log("req.query", req.query)

        // Build query
        let query = { field_manager: fieldManagerId };
        
        if (status) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        console.log("query", query)
        
        const leads = await Lead.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
        console.log("leads", leads)

        const total = await Lead.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                leads,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Get leads error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching leads',
            error: error.message
        });
    }
};

// @desc    Get single lead by ID
// @route   GET /api/leads/:id
// @access  Private (Field Manager only)
const getLeadById = async (req, res) => {
    try {
        const { id } = req.params;
        const fieldManagerId = req.user._id;

        const lead = await Lead.findOne({
            _id: id,
            field_manager: fieldManagerId
        });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        res.status(200).json({
            success: true,
            data: lead
        });

    } catch (error) {
        console.error('Get lead by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching lead',
            error: error.message
        });
    }
};

// @desc    Update lead status
// @route   PUT /api/leads/:id/status
// @access  Private (Field Manager only)
const updateLeadStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const fieldManagerId = req.user._id;

        const lead = await Lead.findOneAndUpdate(
            { _id: id, field_manager: fieldManagerId },
            { 
                status,
                ...(status === 'converted' ? { converted_at: new Date() } : {})
            },
            { new: true, runValidators: true }
        );

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Lead status updated successfully',
            data: lead
        });

    } catch (error) {
        console.error('Update lead status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating lead status',
            error: error.message
        });
    }
};

// @desc    Update lead details
// @route   PUT /api/leads/:id
// @access  Private (Field Manager only)
const updateLead = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, mobile, email } = req.body;
        const fieldManagerId = req.user._id;

        // Check if updating to existing mobile/email for other leads
        if (mobile || email) {
            const duplicateCheck = await Lead.findOne({
                _id: { $ne: id },
                field_manager: fieldManagerId,
                $or: [
                    ...(mobile ? [{ mobile }] : []),
                    ...(email ? [{ email }] : [])
                ]
            });

            if (duplicateCheck) {
                return res.status(400).json({
                    success: false,
                    message: 'Lead with this mobile or email already exists'
                });
            }
        }

        const lead = await Lead.findOneAndUpdate(
            { _id: id, field_manager: fieldManagerId },
            { name, mobile, email },
            { new: true, runValidators: true }
        );

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Lead updated successfully',
            data: lead
        });

    } catch (error) {
        console.error('Update lead error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating lead',
            error: error.message
        });
    }
};

// @desc    Delete lead
// @route   DELETE /api/leads/:id
// @access  Private (Field Manager only)
const deleteLead = async (req, res) => {
    try {
        const { id } = req.params;
        const fieldManagerId = req.user._id;

        const lead = await Lead.findOneAndDelete({
            _id: id,
            field_manager: fieldManagerId,
            status: { $ne: 'converted' } // Can't delete converted leads
        });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found or cannot be deleted (already converted)'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Lead deleted successfully'
        });

    } catch (error) {
        console.error('Delete lead error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting lead',
            error: error.message
        });
    }
};

// @desc    Get lead statistics for field manager
// @route   GET /api/leads/stats/dashboard
// @access  Private (Field Manager only)
const getLeadStats = async (req, res) => {
    try {
        const fieldManagerId = req.user._id;

        const stats = await Lead.aggregate([
            { $match: { field_manager: fieldManagerId } },
            { $group: {
                _id: '$status',
                count: { $sum: 1 }
            }}
        ]);

        // Get total leads
        const totalLeads = await Lead.countDocuments({ field_manager: fieldManagerId });
        
        // Get conversion rate
        const convertedLeads = await Lead.countDocuments({ 
            field_manager: fieldManagerId, 
            status: STATUS.CONVERTED 
        });
         const newLeads = await Lead.countDocuments({ 
            field_manager: fieldManagerId, 
            status: STATUS.NEW
        });
         const contactedLeads = await Lead.countDocuments({ 
            field_manager: fieldManagerId, 
            status: STATUS.CONTACTED
        });
         const lostLeads = await Lead.countDocuments({ 
            field_manager: fieldManagerId, 
            status: STATUS.LOST
        });
        
        const conversionRate = totalLeads > 0 
            ? ((convertedLeads / totalLeads) * 100).toFixed(2) 
            : 0;

        // Format stats
        const formattedStats = {
            total: totalLeads,
            newLeads : newLeads,
            contactedLeads:contactedLeads,
            lostLeads  :lostLeads,
            converted: convertedLeads,
            conversion_rate: conversionRate,
            breakdown : {}
        };

        stats.forEach(stat => {
            formattedStats.breakdown[stat._id] = stat.count;
        });

        res.status(200).json({
            success: true,
            data: formattedStats
        });

    } catch (error) {
        console.error('Get lead stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching lead statistics',
            error: error.message
        });
    }
};

// @desc    Regenerate registration link for lead
// @route   POST /api/leads/:id/regenerate-link
// @access  Private (Field Manager only)
const regenerateRegistrationLink = async (req, res) => {
    try {
        const { id } = req.params;
        const fieldManagerId = req.user.id;

        const lead = await Lead.findOne({
            _id: id,
            field_manager: fieldManagerId,
            status: { $ne: 'converted' }
        });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found or already converted'
            });
        }

        // Generate new token and link
        const token = generateRegistrationToken();
        const registrationLink = `${process.env.FRONTEND_URL}/register?token=${token}&fm=${fieldManagerId}`;

        lead.registration_token = token;
        lead.registration_link = registrationLink;
        lead.token_expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await lead.save();

        res.status(200).json({
            success: true,
            message: 'Registration link regenerated successfully',
            data: {
                registration_link: registrationLink,
                token_expiry: lead.token_expiry
            }
        });

    } catch (error) {
        console.error('Regenerate link error:', error);
        res.status(500).json({
            success: false,
            message: 'Error regenerating registration link',
            error: error.message
        });
    }
};

const createBulkLeads = async (req, res) => {
    try {
        const { leads } = req.body; // Array of lead objects
        const fieldManagerId = req.user._id;

        console.log("Bulk leads request:", { 
            count: leads?.length, 
            fieldManagerId 
        });

        // Validate input
        if (!leads || !Array.isArray(leads)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of leads'
            });
        }

        if (leads.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Leads array cannot be empty'
            });
        }

        if (leads.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Cannot create more than 100 leads at once'
            });
        }

        // Validate each lead
        const validationErrors = [];
        const validLeads = [];
        const mobileSet = new Set(); // For checking duplicates within the bulk upload

        leads.forEach((lead, index) => {
            const errors = [];
            
            // Required fields validation
            if (!lead.name) errors.push('Name is required');
            if (!lead.mobile) errors.push('Mobile number is required');
            if (!lead.email) errors.push('Email is required');

            // Format validation
            if (lead.mobile && !/^\d{10}$/.test(lead.mobile.replace(/\D/g, ''))) {
                errors.push('Invalid mobile number format (10 digits required)');
            }

            if (lead.email && !/^\S+@\S+\.\S+$/.test(lead.email)) {
                errors.push('Invalid email format');
            }

            // Check for duplicates within the bulk upload
            const cleanMobile = lead.mobile?.replace(/\D/g, '');
            if (mobileSet.has(cleanMobile)) {
                errors.push('Duplicate mobile number within bulk upload');
            } else {
                mobileSet.add(cleanMobile);
            }

            // Validate status if provided
            if (lead.status && !Object.values(STATUS).includes(lead.status)) {
                errors.push(`Invalid status. Valid values: ${Object.values(STATUS).join(', ')}`);
            }

            if (errors.length > 0) {
                validationErrors.push({
                    index: index + 1,
                    lead: lead,
                    errors: errors
                });
            } else {
                validLeads.push({
                    name: lead.name.trim(),
                    mobile: cleanMobile,
                    email: lead.email.toLowerCase().trim(),
                    field_manager: fieldManagerId,
                    status: lead.status || STATUS.NEW,
                    ...(lead.notes && { notes: lead.notes }) // If you have notes field
                });
            }
        });

        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed for some leads',
                errors: validationErrors
            });
        }

        // Check for existing leads in database
        const mobiles = validLeads.map(lead => lead.mobile);
        const emails = validLeads.map(lead => lead.email);

        const existingLeads = await Lead.find({
            field_manager: fieldManagerId,
            $or: [
                { mobile: { $in: mobiles } },
                { email: { $in: emails } }
            ]
        }).select('mobile email');

        // Create a set of existing mobiles and emails
        const existingMobiles = new Set(existingLeads.map(lead => lead.mobile));
        const existingEmails = new Set(existingLeads.map(lead => lead.email));

        // Filter out leads that already exist
        const newLeads = validLeads.filter(lead => 
            !existingMobiles.has(lead.mobile) && !existingEmails.has(lead.email)
        );

        const skippedCount = validLeads.length - newLeads.length;

        if (newLeads.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'All leads already exist in your database',
                stats: {
                    total: validLeads.length,
                    created: 0,
                    skipped: skippedCount
                }
            });
        }

        // Insert new leads
        const insertedLeads = await Lead.insertMany(newLeads, { 
            ordered: false // Continue even if some fail
        });

        // Generate registration links for each created lead
        const leadsWithLinks = insertedLeads.map(lead => {
            const token = generateRegistrationToken();
            const registrationLink = `${process.env.FRONTEND_URL}/register?token=${token}&fm=${fieldManagerId}`;
            
            // Update lead with token (if you want to store it)
            // lead.registration_token = token;
            // lead.registration_link = registrationLink;
            // lead.save();
            
            return {
                ...lead.toObject(),
                registration_link: registrationLink
            };
        });

        res.status(201).json({
            success: true,
            message: `Successfully created ${insertedLeads.length} leads`,
            data: {
                created: leadsWithLinks,
                stats: {
                    total_received: leads.length,
                    valid_leads: validLeads.length,
                    created: insertedLeads.length,
                    skipped_existing: skippedCount,
                    failed_validation: validationErrors.length
                }
            }
        });

    } catch (error) {
        console.error('Bulk create leads error:', error);
        
        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Some leads already exist in database',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating bulk leads',
            error: error.message
        });
    }
};

// @desc    get all leads for the Admin to see
// @route   POST /api/leads/admin
// @access  Private (admin only)
const getAllLeadsForAdmin = async (req, res) => {
    try {
        const { status, page = 1, limit = 10, search, field_manager } = req.query;

        // Build query
        let query = {};
        
        if (field_manager) query.field_manager = field_manager;
        if (status) query.status = status;

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);
        
        // Get leads with field manager details
        const leads = await Lead.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('field_manager', 'username email mobile company')
            .lean();

        const total = await Lead.countDocuments(query);

        // Get status counts for stats
        const statusCounts = await Lead.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const statusBreakdown = {};
        statusCounts.forEach(item => {
            statusBreakdown[item._id] = item.count;
        });

        // Get unique field managers count
        const uniqueFMs = await Lead.distinct('field_manager');

        res.status(200).json({
            success: true,
            data: {
                leads,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limitNum),
                    limit: limitNum
                },
                stats: {
                    totalLeads: total,
                    uniqueFieldManagers: uniqueFMs.length,
                    statusBreakdown: statusBreakdown
                }
            }
        });

    } catch (error) {
        console.error('Admin get all leads error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching leads',
            error: error.message
        });
    }
};



module.exports ={
    regenerateRegistrationLink,
    getLeadStats,
    deleteLead,
    updateLead,
    updateLeadStatus,
    getLeadById,
    getLeads,
    createLead,
    createBulkLeads,
    getAllLeadsForAdmin
} 