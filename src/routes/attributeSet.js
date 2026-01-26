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

const {pagination} = require('../middleware/pagination')


// Standard REST Routes
router.route('/')
    .post( authenticate,authorizePermission("can_manage_products"),createAttributeSet)
    .get( authenticate,authorizePermission("can_manage_products"),pagination,getAllAttributeSets);

router.route('/:id')
    .get( authenticate,authorizePermission("can_manage_products"),getAttributeSetById)
    .put(authenticate,authorizePermission("can_manage_products"),updateAttributeSet)
    .delete(authenticate,authorizePermission("can_manage_products"),deleteAttributeSet);

module.exports = router;