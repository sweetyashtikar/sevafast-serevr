const express = require('express');
const Roles = require('../controllers/roleController');
const router = express.Router();
const {
  authenticate,
  authorizePermission,
  optionalAuth,
  checkIfAdmin
} = require("../middleware/authMiddleware");

// Route to create a new role

router.route('/')
    .get( authenticate,checkIfAdmin,Roles.getAllRoles)
    .post(authenticate,checkIfAdmin,Roles.createRole);


router.route('/:id')
    .put(authenticate,checkIfAdmin,Roles.updateRole)
    .delete(authenticate,checkIfAdmin,Roles.deleteRole);
    
module.exports = router;