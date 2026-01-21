const FAQ = require('../models/faq');

// Create a new FAQ
const createFAQ = async (req, res) => {
    try {
        const { question, answer, status } = req.body;
        
        // Basic validation
        if (!question || !answer) {
            return res.status(400).json({
                success: false,
                message: 'Question and answer are required'
            });
        }

        const newFAQ = new FAQ({
            question,
            answer,
            status: status !== undefined ? status : true
        });

        const savedFAQ = await newFAQ.save();
        
        res.status(201).json({
            success: true,
            message: 'FAQ created successfully',
            data: savedFAQ
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating FAQ',
            error: error.message
        });
    }
};

// Get all FAQs
const getAllFAQs = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        
        let query = {};
        
        // Filter by status if provided
        if (status !== undefined) {
            query.status = status === 'true';
        }
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        const [faqs, total] = await Promise.all([
            FAQ.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            FAQ.countDocuments(query)
        ]);
        
        res.status(200).json({
            success: true,
            message: 'FAQs retrieved successfully',
            data: faqs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving FAQs',
            error: error.message
        });
    }
};

// Get FAQ by ID
const getFAQById = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid FAQ ID'
            });
        }
        
        const faq = await FAQ.findById(id);
        
        if (!faq) {
            return res.status(404).json({
                success: false,
                message: 'FAQ not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'FAQ retrieved successfully',
            data: faq
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving FAQ',
            error: error.message
        });
    }
};

// Update FAQ by ID
const updateFAQ = async (req, res) => {
    try {
        const { id } = req.params;
        const { question, answer, status } = req.body;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid FAQ ID'
            });
        }
        
        const updateData = {};
        if (question !== undefined) updateData.question = question;
        if (answer !== undefined) updateData.answer = answer;
        if (status !== undefined) updateData.status = status;
        
        // Check if there's anything to update
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields provided for update'
            });
        }
        
        const updatedFAQ = await FAQ.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        
        if (!updatedFAQ) {
            return res.status(404).json({
                success: false,
                message: 'FAQ not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'FAQ updated successfully',
            data: updatedFAQ
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating FAQ',
            error: error.message
        });
    }
};

// Delete FAQ by ID
const deleteFAQ = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid FAQ ID'
            });
        }
        
        const deletedFAQ = await FAQ.findByIdAndDelete(id);
        
        if (!deletedFAQ) {
            return res.status(404).json({
                success: false,
                message: 'FAQ not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'FAQ deleted successfully',
            data: deletedFAQ
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting FAQ',
            error: error.message
        });
    }
};

// Toggle FAQ status
const toggleFAQStatus = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid FAQ ID'
            });
        }
        
        const faq = await FAQ.findById(id);
        
        if (!faq) {
            return res.status(404).json({
                success: false,
                message: 'FAQ not found'
            });
        }
        
        const updatedFAQ = await FAQ.findByIdAndUpdate(
            id,
            { $set: { status: !faq.status } },
            { new: true }
        );
        
        res.status(200).json({
            success: true,
            message: `FAQ ${updatedFAQ.status ? 'activated' : 'deactivated'} successfully`,
            data: updatedFAQ
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error toggling FAQ status',
            error: error.message
        });
    }
};

module.exports = {
    createFAQ,
    getAllFAQs,
    getFAQById,
    updateFAQ,
    deleteFAQ,
    toggleFAQStatus
};