const express = require('express');
const router = express.Router();
const {
    createAttributeValue,
    getAllAttributeValues,
    updateAttributeValue,
    deleteAttributeValue
} = require('../controllers/attributeValue');

const {
  authenticate,
  authorizePermission,
  optionalAuth,
} = require("../middleware/authMiddleware");


router.route('/')
    .post( authenticate,authorizePermission("can_manage_products"),createAttributeValue)
    .get(getAllAttributeValues);

router.route('/:id')
    .put( authenticate,authorizePermission("can_manage_products"),updateAttributeValue)
    .delete( authenticate,authorizePermission("can_manage_products"),deleteAttributeValue);

module.exports = router;