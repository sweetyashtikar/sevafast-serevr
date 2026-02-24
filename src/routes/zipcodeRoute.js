// routes/zipcodeRoutes.js
const express = require('express');
const router = express.Router();
const {
    createZipcode,
    bulkCreateZipcodes,
    getAllZipcodes,
    getZipcodeById,
    checkZipcodeAvailability,
    updateZipcode,
    deleteZipcode,
    bulkDeleteZipcodes,
    getZipcodesByCity,
    checkZipcodeAvailabilityTrue
} = require('../controllers/zipcodeController');

const {pagination} = require('../middleware/pagination')

router.get('/check/delivery-true', checkZipcodeAvailabilityTrue)
// Public routes (for checking service availability)
router.get('/check/:zipcode', checkZipcodeAvailability);
router.get('/:cityId',getZipcodesByCity )


router.route('/')
    .post(createZipcode)
    .get(pagination,getAllZipcodes)//apply pagination

router.route('/:id')
    .get(getZipcodeById)
    .put(updateZipcode)
    .delete(deleteZipcode)

router.post('/bulk', bulkCreateZipcodes);
router.delete('/bulk/delete', bulkDeleteZipcodes);


module.exports = router;