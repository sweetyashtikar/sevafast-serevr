const express = require('express');
const router = express.Router();
const cityController = require('../controllers/cityController');
const {pagination} = require('../middleware/pagination'); // The middleware we made

router.route('/cities')
    .get(pagination, cityController.getCities)
    .post(cityController.createCity);

router.route('/cities/:id')
    .put(cityController.updateCity)
    .delete(cityController.deleteCity);

module.exports = router;