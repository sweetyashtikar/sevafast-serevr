const express = require('express');
const User = require('../controllers/UserController');
const router = express.Router();

// Route to create a new role

router.post('/users',User.RegisterUser);
router.get('/users',User.getAllUsers);
router.put('/users/:id',User.updateUser);
router.delete('/users/:id',User.deleteUser);
router.get('/users/vendors',User.getAllVendors);


module.exports = router;