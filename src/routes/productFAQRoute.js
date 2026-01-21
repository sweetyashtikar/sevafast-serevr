const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/productFAQController');

// Create a new question
router.post('/questions', createQuestion);

// Get questions for a specific product
router.get('/products/:product_id/questions', getProductQuestions);

// Get question by ID
router.get('/questions/:id', getQuestionById);

// Update a question
router.put('/questions/:id', updateQuestion);

// Delete a question
router.delete('/questions/:id', deleteQuestion);

// Answer a question
router.post('/questions/:id/answer', answerQuestion);

// Vote on a question
router.post('/questions/:id/vote', voteOnQuestion);

// Remove vote from question
router.delete('/questions/:id/vote', removeVote);

// Get user's questions
router.get('/users/:user_id/questions', getUserQuestions);

// Search questions
router.get('/questions/search', searchQuestions);

// Get unanswered questions (admin/seller)
router.get('/questions/unanswered', getUnansweredQuestions);

// Get question statistics
router.get('/stats/:product_id', getQuestionStats);

module.exports = router;