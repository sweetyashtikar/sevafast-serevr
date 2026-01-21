const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticate,authorizePermission,optionalAuth, checkIfAdmin} = require("../middleware/authMiddleware");


router.route('/')
    .post(authenticate,cartController.addToCart)
    .get(authenticate,cartController.getCart)
    .put(authenticate, cartController.updateQuantity)
    .delete(authenticate, cartController.removeItem)



module.exports = router;