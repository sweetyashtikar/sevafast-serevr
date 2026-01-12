const express = require("express");
const router = express.Router();
const {
    deleteAttribute,
    updateAttribute,
    createAttribute,
    getAttributeByAttributeSetID,
    getAttributeById,
    getAllAttributes
} = require("../controllers/attribute");
const {
  authenticate,
  authorizePermission,
  optionalAuth,
} = require("../middleware/authMiddleware");

router.route("/")
    .post( authenticate,authorizePermission("can_manage_products"),createAttribute)
    .get(getAllAttributes);

router.route("/:id")
    .get(getAttributeById)
    .get(getAttributeByAttributeSetID)
    .put( authenticate,authorizePermission("can_manage_products"),updateAttribute)
    .delete( authenticate,authorizePermission("can_manage_products"),deleteAttribute);

module.exports = router;