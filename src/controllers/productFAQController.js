const ProductFAQ = require('../models/productFAQ');
const mongoose = require('mongoose');

// Create a new question for a product
const createQuestion = async (req, res) => {
    try {
        const { user_id, product_id, question } = req.body;
        
        // Validate required fields
        if (!user_id || !product_id || !question) {
            return res.status(400).json({
                success: false,
                message: 'user_id, product_id, and question are required'
            });
        }
        
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(user_id) || !mongoose.Types.ObjectId.isValid(product_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user_id or product_id format'
            });
        }
        
        // Trim and validate question length
        const trimmedQuestion = question.trim();
        if (trimmedQuestion.length < 5) {
            return res.status(400).json({
                success: false,
                message: 'Question must be at least 5 characters long'
            });
        }
        
        const newQuestion = new ProductFAQ({
            user_id,
            product_id,
            question: trimmedQuestion
        });
        
        const savedQuestion = await newQuestion.save();
        
        // Populate user details
        const populatedQuestion = await ProductFAQ.findById(savedQuestion._id)
            .populate('user_id', 'name email profile_picture');
        
        res.status(201).json({
            success: true,
            message: 'Question submitted successfully',
            data: populatedQuestion
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error submitting question',
            error: error.message
        });
    }
};

// Answer a question
const answerQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { answer, answered_by } = req.body;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid question ID'
            });
        }
        
        if (!answer || !answered_by) {
            return res.status(400).json({
                success: false,
                message: 'answer and answered_by are required'
            });
        }
        
        if (!mongoose.Types.ObjectId.isValid(answered_by)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid answered_by format'
            });
        }
        
        const trimmedAnswer = answer.trim();
        if (trimmedAnswer.length < 5) {
            return res.status(400).json({
                success: false,
                message: 'Answer must be at least 5 characters long'
            });
        }
        
        const updatedQuestion = await ProductFAQ.findByIdAndUpdate(
            id,
            {
                answer: trimmedAnswer,
                answered_by,
                updated_at: new Date()
            },
            { new: true, runValidators: true }
        ).populate('user_id', 'name email')
         .populate('answered_by', 'name email');
        
        if (!updatedQuestion) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Answer submitted successfully',
            data: updatedQuestion
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error submitting answer',
            error: error.message
        });
    }
};

// Get all questions for a product with filters
const getProductQuestions = async (req, res) => {
    try {
        const { product_id } = req.params;
        const { 
            page = 1, 
            limit = 10, 
            answered, 
            sort_by = 'date_added', 
            order = 'desc',
            search 
        } = req.query;
        
        if (!mongoose.Types.ObjectId.isValid(product_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid product_id format'
            });
        }
        
        // Build query
        let query = { product_id };
        
        // Filter by answered status
        if (answered !== undefined) {
            if (answered === 'true' || answered === true) {
                query.answer = { $ne: null };
            } else if (answered === 'false' || answered === false) {
                query.answer = null;
            }
        }
        
        // Search in questions
        if (search && search.trim()) {
            query.question = { $regex: search.trim(), $options: 'i' };
        }
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        // Determine sort order
        let sortOption = {};
        const sortField = sort_by === 'votes' ? 'votes' : 'date_added';
        const sortOrder = order === 'asc' ? 1 : -1;
        sortOption[sortField] = sortOrder;
        
        const [questions, total] = await Promise.all([
            ProductFAQ.find(query)
                .populate('user_id', 'name email profile_picture')
                .populate('answered_by', 'name email')
                .sort(sortOption)
                .skip(skip)
                .limit(limitNum),
            ProductFAQ.countDocuments(query)
        ]);
        
        // Separate answered and unanswered questions
        const answeredQuestions = questions.filter(q => q.answer !== null);
        const unansweredQuestions = questions.filter(q => q.answer === null);
        
        res.status(200).json({
            success: true,
            message: 'Questions retrieved successfully',
            data: {
                questions,
                summary: {
                    total,
                    answered: answeredQuestions.length,
                    unanswered: unansweredQuestions.length
                }
            },
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
            message: 'Error retrieving questions',
            error: error.message
        });
    }
};

// Get single question by ID
const getQuestionById = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid question ID'
            });
        }
        
        const question = await ProductFAQ.findById(id)
            .populate('user_id', 'name email profile_picture')
            .populate('answered_by', 'name email')
            .populate('voted_by', 'name email');
        
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Question retrieved successfully',
            data: question
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving question',
            error: error.message
        });
    }
};

// Update a question (user can edit their question)
const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { question, user_id } = req.body;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid question ID'
            });
        }
        
        if (!question) {
            return res.status(400).json({
                success: false,
                message: 'Question text is required'
            });
        }
        
        const trimmedQuestion = question.trim();
        if (trimmedQuestion.length < 5) {
            return res.status(400).json({
                success: false,
                message: 'Question must be at least 5 characters long'
            });
        }
        
        // Check if user owns the question
        const existingQuestion = await ProductFAQ.findById(id);
        if (!existingQuestion) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }
        
        if (existingQuestion.user_id.toString() !== user_id) {
            return res.status(403).json({
                success: false,
                message: 'You can only edit your own questions'
            });
        }
        
        // Check if question already has an answer
        if (existingQuestion.answer) {
            return res.status(400).json({
                success: false,
                message: 'Cannot edit question that already has an answer'
            });
        }
        
        const updatedQuestion = await ProductFAQ.findByIdAndUpdate(
            id,
            {
                question: trimmedQuestion,
                updated_at: new Date()
            },
            { new: true, runValidators: true }
        ).populate('user_id', 'name email');
        
        res.status(200).json({
            success: true,
            message: 'Question updated successfully',
            data: updatedQuestion
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating question',
            error: error.message
        });
    }
};

// Delete a question
const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, is_admin } = req.body;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid question ID'
            });
        }
        
        const question = await ProductFAQ.findById(id);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }
        
        // Check permissions: user can delete their own, admin can delete any
        if (!is_admin && question.user_id.toString() !== user_id) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own questions'
            });
        }
        
        await ProductFAQ.findByIdAndDelete(id);
        
        res.status(200).json({
            success: true,
            message: 'Question deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting question',
            error: error.message
        });
    }
};

// Vote on a question (helpful/not helpful)
const voteOnQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, vote_type = 'upvote' } = req.body;
        
        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ID format'
            });
        }
        
        const question = await ProductFAQ.findById(id);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }
        
        // Check if user already voted
        const hasVoted = question.voted_by.some(voterId => voterId.toString() === user_id);
        
        if (hasVoted) {
            return res.status(400).json({
                success: false,
                message: 'You have already voted on this question'
            });
        }
        
        // Calculate vote change
        const voteChange = vote_type === 'upvote' ? 1 : -1;
        
        const updatedQuestion = await ProductFAQ.findByIdAndUpdate(
            id,
            {
                $inc: { votes: voteChange },
                $push: { voted_by: user_id }
            },
            { new: true }
        ).populate('user_id', 'name email');
        
        res.status(200).json({
            success: true,
            message: `Question ${vote_type}d successfully`,
            data: {
                votes: updatedQuestion.votes,
                has_voted: true
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error voting on question',
            error: error.message
        });
    }
};

// Remove vote from question
const removeVote = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;
        
        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ID format'
            });
        }
        
        const question = await ProductFAQ.findById(id);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }
        
        // Check if user has voted
        const hasVoted = question.voted_by.some(voterId => voterId.toString() === user_id);
        
        if (!hasVoted) {
            return res.status(400).json({
                success: false,
                message: 'You have not voted on this question'
            });
        }
        
        // Determine vote value to remove (assuming upvote = +1)
        const voteChange = -1;
        
        const updatedQuestion = await ProductFAQ.findByIdAndUpdate(
            id,
            {
                $inc: { votes: voteChange },
                $pull: { voted_by: user_id }
            },
            { new: true }
        );
        
        res.status(200).json({
            success: true,
            message: 'Vote removed successfully',
            data: {
                votes: updatedQuestion.votes,
                has_voted: false
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error removing vote',
            error: error.message
        });
    }
};

// Get user's questions
const getUserQuestions = async (req, res) => {
    try {
        const { user_id } = req.params;
        const { page = 1, limit = 10, answered } = req.query;
        
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user_id format'
            });
        }
        
        let query = { user_id };
        
        if (answered !== undefined) {
            if (answered === 'true' || answered === true) {
                query.answer = { $ne: null };
            } else if (answered === 'false' || answered === false) {
                query.answer = null;
            }
        }
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        const [questions, total] = await Promise.all([
            ProductFAQ.find(query)
                .populate('product_id', 'name images price')
                .populate('answered_by', 'name email')
                .sort({ date_added: -1 })
                .skip(skip)
                .limit(limitNum),
            ProductFAQ.countDocuments(query)
        ]);
        
        res.status(200).json({
            success: true,
            message: 'User questions retrieved successfully',
            data: questions,
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
            message: 'Error retrieving user questions',
            error: error.message
        });
    }
};

// Search questions across all products
const searchQuestions = async (req, res) => {
    try {
        const { q, product_id, limit = 20 } = req.query;
        
        if (!q || q.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 3 characters'
            });
        }
        
        let query = { question: { $regex: q.trim(), $options: 'i' } };
        
        if (product_id && mongoose.Types.ObjectId.isValid(product_id)) {
            query.product_id = product_id;
        }
        
        const questions = await ProductFAQ.find(query)
            .populate('product_id', 'name images')
            .populate('user_id', 'name')
            .limit(parseInt(limit))
            .sort({ votes: -1, date_added: -1 });
        
        res.status(200).json({
            success: true,
            message: 'Search results retrieved',
            data: questions,
            count: questions.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching questions',
            error: error.message
        });
    }
};

// Get unanswered questions (for admin/seller dashboard)
const getUnansweredQuestions = async (req, res) => {
    try {
        const { page = 1, limit = 20, product_id } = req.query;
        
        let query = { answer: null };
        
        if (product_id && mongoose.Types.ObjectId.isValid(product_id)) {
            query.product_id = product_id;
        }
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        const [questions, total] = await Promise.all([
            ProductFAQ.find(query)
                .populate('user_id', 'name email')
                .populate('product_id', 'name images')
                .sort({ date_added: -1 })
                .skip(skip)
                .limit(limitNum),
            ProductFAQ.countDocuments(query)
        ]);
        
        res.status(200).json({
            success: true,
            message: 'Unanswered questions retrieved',
            data: questions,
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
            message: 'Error retrieving unanswered questions',
            error: error.message
        });
    }
};

// Get question statistics
const getQuestionStats = async (req, res) => {
    try {
        const { product_id } = req.params;
        
        let matchStage = {};
        if (product_id && mongoose.Types.ObjectId.isValid(product_id)) {
            matchStage.product_id = mongoose.Types.ObjectId(product_id);
        }
        
        const stats = await ProductFAQ.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalQuestions: { $sum: 1 },
                    answeredQuestions: {
                        $sum: { $cond: [{ $ne: ["$answer", null] }, 1, 0] }
                    },
                    unansweredQuestions: {
                        $sum: { $cond: [{ $eq: ["$answer", null] }, 1, 0] }
                    },
                    totalVotes: { $sum: "$votes" },
                    avgVotes: { $avg: "$votes" }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalQuestions: 1,
                    answeredQuestions: 1,
                    unansweredQuestions: 1,
                    totalVotes: 1,
                    avgVotes: { $round: ["$avgVotes", 2] },
                    answerRate: {
                        $round: [
                            {
                                $multiply: [
                                    {
                                        $cond: [
                                            { $eq: ["$totalQuestions", 0] },
                                            0,
                                            { $divide: ["$answeredQuestions", "$totalQuestions"] }
                                        ]
                                    },
                                    100
                                ]
                            },
                            2
                        ]
                    }
                }
            }
        ]);
        
        res.status(200).json({
            success: true,
            message: 'Statistics retrieved successfully',
            data: stats[0] || {
                totalQuestions: 0,
                answeredQuestions: 0,
                unansweredQuestions: 0,
                totalVotes: 0,
                avgVotes: 0,
                answerRate: 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving statistics',
            error: error.message
        });
    }
};

module.exports = {
    createQuestion,
    answerQuestion,
    getProductQuestions,
    getQuestionById,
    updateQuestion,
    deleteQuestion,
    voteOnQuestion,
    removeVote,
    getUserQuestions,
    searchQuestions,
    getUnansweredQuestions,
    getQuestionStats
};