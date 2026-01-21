// routes/addressRoutes.js
const express = require('express');
const router = express.Router();
const {
    createAddress,
    getUserAddresses,
    getAddressById,
    getDefaultAddress,
    updateAddress,
    setDefaultAddress,
    deleteAddress,
    findNearbyAddresses,
    bulkCreateAddresses
} = require('../controllers/addressController');

// Public routes (with authentication middleware in real app)
router.post('/nearby', findNearbyAddresses); // Find addresses near location

router.route("/:id")
    .get(getAddressById)
    .put(updateAddress)
    .delete(deleteAddress)

// User-specific routes
router.post('/', createAddress);
router.post('/bulk', bulkCreateAddresses);
router.get('/user/:user_id', getUserAddresses);
router.get('/user/:user_id/default', getDefaultAddress);
router.patch('/:id/set-default', setDefaultAddress);


module.exports = router;