const express = require('express');
const router = express.Router();
const cityController = require('../controllers/cityController');
const {pagination} = require('../middleware/pagination'); // The middleware we made

router.post('/bulk-city', cityController.uploadBulkCities)
router.route('/')
    .get(pagination, cityController.getCities)
    .post(cityController.createCity);

router.route('/:id')
    .get(cityController.getcityById)      
    .put(cityController.updateCity)
    .delete(cityController.deleteCity);


module.exports = router;