// routes/areaRoutes.js
const express = require('express');
const router = express.Router();
const {
    createArea,
    getAllAreas,
    getAreaById,
    getAreasByCity,
    updateArea,
    toggleAreaStatus,
    deleteArea,
    calculateDeliveryCharges
} = require('../controllers/areaController');

// Public routes (for frontend/delivery calculations)
router.get('/city/:city_id', getAreasByCity); // Get areas by city
router.post('/calculate-delivery', calculateDeliveryCharges); // Calculate delivery charges


router.route('/')
    .post(createArea)
    .get(getAllAreas)//apply pagination

router.route('/:id')
    .get(getAreaById)
    .put(updateArea)
    .delete(deleteArea)

router.patch('/:id/toggle-status', toggleAreaStatus);

module.exports = router;