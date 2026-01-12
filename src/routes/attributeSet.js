const express = require('express');
const router = express.Router();
const {
    createAttributeSet,
    getAllAttributeSets,
    getAttributeSetById,
    updateAttributeSet,
    deleteAttributeSet
} = require('../controllers/attributeSet');
const {
  authenticate,
  authorizePermission,
  optionalAuth,
} = require("../middleware/authMiddleware");


// Standard REST Routes
router.route('/')
    .post( authenticate,authorizePermission("can_manage_products"),createAttributeSet)
    .get(getAllAttributeSets);

router.route('/:id')
    .get(getAttributeSetById)
    .put(authenticate,authorizePermission("can_manage_products"),updateAttributeSet)
    .delete(authenticate,authorizePermission("can_manage_products"),deleteAttributeSet);

module.exports = router;