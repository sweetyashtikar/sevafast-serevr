const City = require("../models/city");
const { ObjectId } = require("mongodb");

// @desc    Get all cities (with pagination, search, sort)
const getCities = async (req, res) => {
  try {
    const { limit, offset, sort, searchQuery, filters } = req.paginationQuery;
    const finalQuery = { ...searchQuery, ...filters };

    const cities = await City.find(finalQuery)
      .sort(sort)
      .limit(limit)
      .skip(offset);

    const total = await City.countDocuments(finalQuery);

    res.status(200).json({
      success: true,
      total,
      limit,
      offset,
      count: cities.length,
      cities,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getcityById = async (req, res) => {
  const id = req.params.id;
  try {
    const city = await City.find(id);
    if (!city)  return res.status(404).json({ success: false, message: "city not found" });
    res.status(200).json({ success: true, data: city });
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
  const { name } = req.body;
  try {
    const city = await City.findByIdAndUpdate(
      city_id,
      { name },
      { new: true, runValidators: true }
    );

    if (!city)
      return res
        .status(404)
        .json({ success: false, message: "City not found" });

    res.status(200).json({ success: true, data: city });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a city
const deleteCity = async (req, res) => {
  const city_id = req.params.id;
  try {
    const city = await City.findOneAndDelete(city_id);
    if (!city)
      return res
        .status(404)
        .json({ success: false, message: "City not found" });

    res
      .status(200)
      .json({ success: true, message: "City deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const uploadBulkCities = async (req, res) => {
  console.log("req.body", req.body)
    try {
        const { cities } = req.body;

        // Validate input
        if (!cities || !Array.isArray(cities)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of cities'
            });
        }

        if (cities.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cities array cannot be empty'
            });
        }

        // Validate each city name
        const invalidCities = cities.filter(city => 
            !city.name || typeof city.name !== 'string' || city.name.trim() === ''
        );

        if (invalidCities.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid city names found',
                invalidCities
            });
        }

        // Clean and prepare cities data
        const citiesToInsert = cities.map(city => ({
            name: city.name.trim()
        }));

        // Check for duplicates in the request
        const uniqueNames = new Set();
        const duplicates = [];

        citiesToInsert.forEach(city => {
            if (uniqueNames.has(city.name)) {
                duplicates.push(city.name);
            } else {
                uniqueNames.add(city.name);
            }
        });

        if (duplicates.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Duplicate city names found in request',
                duplicates
            });
        }

        // Insert cities with duplicate key handling
        const insertedCities = [];
        const skippedCities = [];

        for (const city of citiesToInsert) {
            try {
                // Use findOneAndUpdate with upsert to avoid duplicates
                const result = await City.findOneAndUpdate(
                    { name: city.name },
                    { name: city.name },
                    { 
                        upsert: true, 
                        new: true, 
                        runValidators: true,
                        setDefaultsOnInsert: true 
                    }
                );

                // Check if it was inserted or already existed
                if (result.createdAt && result.createdAt.getTime() === result.updatedAt.getTime()) {
                    insertedCities.push(result);
                } else {
                    skippedCities.push(result.name);
                }
            } catch (error) {
                // Handle duplicate key errors
                if (error.code === 11000) {
                    skippedCities.push(city.name);
                } else {
                    throw error;
                }
            }
        }

        // Prepare response
        const response = {
            success: true,
            message: `Successfully processed ${citiesToInsert.length} cities`,
            stats: {
                total: citiesToInsert.length,
                inserted: insertedCities.length,
                skipped: skippedCities.length
            }
        };

        // Add inserted cities if needed (optional)
        if (insertedCities.length > 0 && req.query.includeDetails === 'true') {
            response.insertedCities = insertedCities;
        }

        // Add skipped cities if any (optional)
        if (skippedCities.length > 0 && req.query.includeSkipped === 'true') {
            response.skippedCities = skippedCities;
        }

        res.status(201).json(response);

    } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading bulk cities',
            error: error.message
        });
    }
};

module.exports = {
  getCities,
  createCity,
  updateCity,
  deleteCity,
  getcityById,
  uploadBulkCities
};
