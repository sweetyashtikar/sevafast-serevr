const express = require("express");
const router = express.Router();
const { getVendorsByFieldManager } = require("../controllers/vendorController");

router.get("/field-manager/:id", getVendorsByFieldManager);

module.exports = router;