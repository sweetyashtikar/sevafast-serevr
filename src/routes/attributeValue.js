const express = require('express');
const router = express.Router();
const {
    createAttributeValue,
    getAllAttributeValues,
    updateAttributeValue,
    deleteAttributeValue,
    getAttributeValueById,
    getAllAttributeValuesStatusTrue
} = require('../controllers/attributeValue');

const {
  authenticate,
  authorizePermission,
  optionalAuth,
} = require("../middleware/authMiddleware");
const {pagination} = require('../middleware/pagination')

router.get("/status-true", authenticate, pagination, getAllAttributeValuesStatusTrue);
router.route('/')
    .post( authenticate,authorizePermission("can_manage_products"),createAttributeValue)
    .get( authenticate,authorizePermission("can_manage_products"),pagination,getAllAttributeValues);

router.route('/:id')
    .get( authenticate,authorizePermission("can_manage_products"),getAttributeValueById)
    .put( authenticate,authorizePermission("can_manage_products"),updateAttributeValue)
    .delete( authenticate,authorizePermission("can_manage_products"),deleteAttributeValue);

module.exports = router;