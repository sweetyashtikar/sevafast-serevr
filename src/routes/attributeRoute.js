const express = require("express");
const router = express.Router();
const {
    deleteAttribute,
    updateAttribute,
    createAttribute,
    getAttributeById,
    getAllAttributes
} = require("../controllers/attribute");
const {
  authenticate,
  authorizePermission,
  optionalAuth,
} = require("../middleware/authMiddleware");
const {pagination} = require('../middleware/pagination')

router.route("/")
    .post( authenticate,authorizePermission("can_manage_products"),createAttribute)
    .get( authenticate,authorizePermission("can_manage_products"),pagination,getAllAttributes);

router.route("/:id")
    .get( authenticate,authorizePermission("can_manage_products"),getAttributeById)
    .put( authenticate,authorizePermission("can_manage_products"),updateAttribute)
    .delete( authenticate,authorizePermission("can_manage_products"),deleteAttribute);

module.exports = router;