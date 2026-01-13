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
  .post(authenticate,checkIfAdmin,createTax)
  .get(authenticate,checkIfAdmin,getAllTaxes);

router.route('/:id')
  .get(authenticate,checkIfAdmin,getTaxById)
  .put(authenticate,checkIfAdmin,updateTax)
  .delete(authenticate,checkIfAdmin,deleteTax);

module.exports = router;