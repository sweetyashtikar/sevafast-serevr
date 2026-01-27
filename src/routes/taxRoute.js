const express = require('express');
const router = express.Router();
const {
  createTax,
  getAllTaxes,
  getTaxById,
  updateTax,
  deleteTax,
  getAllTaxesStatusTrue
} = require('../controllers/taxController');
const {
  authenticate,
  authorizePermission,
  optionalAuth,
  checkIfAdmin
} = require("../middleware/authMiddleware");
const { pagination } = require("../middleware/pagination");
// Standard RESTful endpoints

router.get("/status-true", authenticate, pagination, getAllTaxesStatusTrue);

router.route('/')
  .post(authenticate,authorizePermission("can_manage_products"),createTax)
  .get(authenticate,authorizePermission("can_manage_products"),getAllTaxes);

router.route('/:id')
  .get(authenticate,authorizePermission("can_manage_products"),getTaxById)
  .put(authenticate,authorizePermission("can_manage_products"),updateTax)
  .delete(authenticate,authorizePermission("can_manage_products"),deleteTax);

module.exports = router;