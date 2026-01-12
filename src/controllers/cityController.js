const City = require('../models/city');
const { ObjectId } = require('mongodb');

// @desc    Get all cities (with pagination, search, sort)
const getCities = async (req, res) => {
    try {
        const { limit, offset, sort, searchQuery } = req.paginationQuery;

        const cities = await City.find(searchQuery)
            .sort(sort)
            .limit(limit)
            .skip(offset);

        const total = await City.countDocuments(searchQuery);

        res.status(200).json({
            success: true,
            total,
            data: cities
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a new city
const createCity = async (req, res) => {
    try {
        const city = await City.create(req.body);
        res.status(201).json({ success: true, data: city });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update a city
const updateCity = async (req, res) => {
    const city_id = req.params.id;
    const {name} = req.body;
    try {
      const city = await City.findByIdAndUpdate(city_id, { name },  {new: true, runValidators: true} );

        if (!city) return res.status(404).json({ success: false, message: "City not found" });

        res.status(200).json({ success: true, data: city });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete a city
const deleteCity = async (req, res) => {
     const city_id = req.params.id;
    try {
        const city = await City.findOneAndDelete(city_id );
        if (!city) return res.status(404).json({ success: false, message: "City not found" });

        res.status(200).json({ success: true, message: "City deleted successfully" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    getCities,
    createCity, 
    updateCity,
    deleteCity
};