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
    bulkCreateAddresses,
    getUserAddressesByAdmin,
    getAllUserAddresses
} = require('../controllers/addressController');
const {authenticate, checkIfAdmin} = require('../middleware/authMiddleware')

// Public routes (with authentication middleware in real app)
router.post('/nearby', findNearbyAddresses); // Find addresses near location

router.get('/user/default', authenticate,getDefaultAddress);
router.route("/user/:id")
    .get(authenticate,getAddressById)
    .put(updateAddress)
    .delete(deleteAddress)

// User-specific routes
router.post('/',authenticate,createAddress);
router.post('/bulk', authenticate, bulkCreateAddresses);
router.get('/user', authenticate,getUserAddresses);
router.patch('/:id/set-default', authenticate,setDefaultAddress);

//adress route to view for the admin of all users
router.get('/admin/user/:user_id/addresses', authenticate,checkIfAdmin, getUserAddressesByAdmin);
router.get('/admin/all-addresses',authenticate, checkIfAdmin, getAllUserAddresses);

module.exports = router;