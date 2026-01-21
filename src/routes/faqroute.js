const express = require('express');
const router = express.Router();
const {
    createFAQ,
    getAllFAQs,
    getFAQById,
    updateFAQ,
    deleteFAQ,
    toggleFAQStatus
} = require('../controllers/faqController');

// Create a new FAQ
router.route('/', createFAQ)
    .post(createFAQ)
    .get(getAllFAQs)


// Get FAQ by ID
router.route('/:id', getFAQById)
    .get(getFAQById)
    .put(updateFAQ)
    .patch(updateFAQ)
    .delete(deleteFAQ)

// Toggle FAQ status
router.patch('/:id/toggle-status', toggleFAQStatus);

module.exports = router;