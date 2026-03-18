const express = require('express');
const router = express.Router();
const vendorLevelController = require('../controllers/vendorLevelController');
const { authenticate, checkIfAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticate, vendorLevelController.getAllLevels);
router.post('/create', authenticate, checkIfAdmin, vendorLevelController.createLevel);
router.put('/update/:id', authenticate, checkIfAdmin, vendorLevelController.updateLevel);
router.delete('/delete/:id', authenticate, checkIfAdmin, vendorLevelController.deleteLevel);

module.exports = router;
