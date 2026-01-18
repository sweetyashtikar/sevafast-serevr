const express = require('express');
const router = express.Router();
const {
  createTax,
  getAllTaxes,
  getTaxById,
  updateTax,
  deleteTax
} = require('../controllers/taxController');
const {
  authenticate,
  authorizePermission,
  optionalAuth,
  checkIfAdmin
} = require("../middleware/authMiddleware");

// Standard RESTful endpoints
router.route('/')
  .post(authenticate,authorizePermission("can_manage_products"),createTax)
  .get(authenticate,authorizePermission("can_manage_products"),getAllTaxes);

router.route('/:id')
  .get(authenticate,authorizePermission("can_manage_products"),getTaxById)
  .put(authenticate,authorizePermission("can_manage_products"),updateTax)
  .delete(authenticate,authorizePermission("can_manage_products"),deleteTax);

module.exports = router;