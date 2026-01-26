const express = require('express');
const Roles = require('../controllers/roleController');
const router = express.Router();
const {
  authenticate,
  authorizePermission,
  optionalAuth,
  checkIfAdmin
} = require("../middleware/authMiddleware");

const {pagination} = require("../middleware/pagination")

// Route to create a new role

router.route('/')
    .get(pagination,Roles.getAllRoles)
    .post(authenticate,checkIfAdmin,Roles.createRole);


router.route('/:id')
    .get(Roles.getRoleById)
    .put(authenticate,checkIfAdmin,Roles.updateRole)
    .delete(authenticate,checkIfAdmin,Roles.deleteRole);
    
module.exports = router;