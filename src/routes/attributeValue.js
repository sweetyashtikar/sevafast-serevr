const express = require('express');
const router = express.Router();
const {
    createAttributeValue,
    getAllAttributeValues,
    updateAttributeValue,
    deleteAttributeValue,
    getAttributeValueById
} = require('../controllers/attributeValue');

const {
  authenticate,
  authorizePermission,
  optionalAuth,
} = require("../middleware/authMiddleware");
const {pagination} = require('../middleware/pagination')


router.route('/')
    .post( authenticate,authorizePermission("can_manage_products"),createAttributeValue)
    .get(pagination,getAllAttributeValues);

router.route('/:id')
    .get(getAttributeValueById)
    .put( authenticate,authorizePermission("can_manage_products"),updateAttributeValue)
    .delete( authenticate,authorizePermission("can_manage_products"),deleteAttributeValue);

module.exports = router;