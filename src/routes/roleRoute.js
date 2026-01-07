const express = require('express');
const Roles = require('../controllers/roleController');
const router = express.Router();

// Route to create a new role

router.route('/roles')
    .get(Roles.getAllRoles)
    .post(Roles.createRole);


router.route('/roles/:id')
    .put(Roles.updateRole)
    .delete(Roles.deleteRole);
    
module.exports = router;