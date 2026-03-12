// routes/leadRoutes.js
const express = require('express');
const router = express.Router();
const {
    createLead,
    getLeads,
    getLeadById,
    updateLeadStatus,
    updateLead,
    deleteLead,
    getLeadStats,
    regenerateRegistrationLink,
    createBulkLeads,
    getAllLeadsForAdmin
} = require('../controllers/leadController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All routes are protected and only accessible by field managers
router.use(authenticate);
// router.use(authorize('field_manager'));

//admin
router.get('/admin', getAllLeadsForAdmin);

router.route('/')
    .post(createLead)
    .get(getLeads);

router.post('/bulk', createBulkLeads);


router.get('/stats/dashboard', getLeadStats);

router.route('/:id')
    .get(getLeadById)
    .put(updateLead)
    .delete(deleteLead);

router.patch('/:id/status', updateLeadStatus);
router.post('/:id/regenerate-link', regenerateRegistrationLink);



module.exports = router;