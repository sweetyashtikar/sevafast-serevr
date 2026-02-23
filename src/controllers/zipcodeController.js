// const Zipcode = require('../models/zipcode'); // Adjust path as needed
// const {NODE_ENV} = require('../env-variables')


// const createZipcode = async (req, res) => {
//     try {
//         const { zipcode } = req.body;

//         if (!zipcode) return res.status(400).json({success: false,message: 'Zipcode is required'});
        
//         const existingZipcode = await Zipcode.findOne({ zipcode });
//         if (existingZipcode) return res.status(409).json({success: false,message: 'Zipcode already exists'});
        
//         const newZipcode = await Zipcode.create({zipcode: zipcode.trim()});

//         res.status(201).json({
//             success: true,
//             message: 'Zipcode added successfully',
//             data: newZipcode
//         });
//     } catch (error) {
//         console.error('Error creating zipcode:', error);

//         if (error.code === 11000) return res.status(409).json({ success: false, message: 'Zipcode already exists'});

//         res.status(500).json({
//             success: false,
//             message: 'Failed to add zipcode',
//             error: NODE_ENV === 'development' ? error.message : undefined
//         });
//     }
// };

// // 2. BULK CREATE - Add multiple zipcodes at once
// const bulkCreateZipcodes = async (req, res) => {
//     try {
//         const { zipcode } = req.body;

//         if (!Array.isArray(zipcode) || zipcode.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Array of zipcodes is required'
//             });
//         }

//         // Clean and deduplicate zipcodes
//         const uniqueZipcodes = [...new Set(zipcode.map(z => z.trim()))];

//         // Check for existing zipcodes
//         const existing = await Zipcode.find({zipcode: { $in: uniqueZipcodes }});

//         const existingSet = new Set(existing.map(z => z.zipcode));
//         const newZipcodes = uniqueZipcodes.filter(z => !existingSet.has(z)).map(zipcode => ({ zipcode }));

//         // Insert new zipcodes
//         let insertedZipcodes = [];
//         if (newZipcodes.length > 0) {
//             insertedZipcodes = await Zipcode.insertMany(newZipcodes, { ordered: false });
//         }

//         res.status(201).json({
//             success: true,
//             message: 'Zipcodes processed successfully',
//             data: {
//                 totalRequested: zipcode.length,
//                 uniqueProvided: uniqueZipcodes.length,
//                 alreadyExists: existing.length,
//                 newlyAdded: insertedZipcodes.length,
//                 duplicatesIgnored: zipcode.length - uniqueZipcodes.length
//             },
//             added: insertedZipcodes
//         });
//     } catch (error) {
//         console.error('Error bulk creating zipcodes:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to process zipcodes',
//             error: NODE_ENV === 'development' ? error.message : undefined
//         });
//     }
// };

// // 3. READ - Get all zipcodes (with pagination)
// const getAllZipcodes = async (req, res) => {
//     const { limit, offset, sort, searchQuery, filters } = req.paginationQuery;
    
//     try {
//         const finalQuery = { ...searchQuery, ...filters };

//         // Get total count for pagination
//         const total = await Zipcode.countDocuments(finalQuery);

//         // Get paginated results
//         const zipcodes = await Zipcode.find(finalQuery)
//             .sort(sort)
//             .skip(offset)
//             .limit(limit)
//             .lean();
        
//         const currentPage = Math.floor(offset / limit) + 1;

//         res.status(200).json({
//             success: true,
//             message: 'Zipcodes retrieved successfully',
//             data: {
//                 zipcodes,
//                 pagination: {
//                     currentPage: page,
//                     totalPages: Math.ceil(total / limit),
//                     totalItems: total,
//                     itemsPerPage: limit,
//                     hasNextPage: offset + limit < total,
//                     hasPreviousPage: offset > 0
//                 }
//             }
//         });
//     } catch (error) {
//         console.error('Error fetching zipcodes:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to fetch zipcodes'
//         });
//     }
// };

// // 4. READ - Get single zipcode by ID
// const getZipcodeById = async (req, res) => {
//     try {
//         const { id } = req.params;

//         const zipcode = await Zipcode.findById(id);

//         if (!zipcode) return res.status(404).json({success: false,message: 'Zipcode not found'});

//         res.status(200).json({
//             success: true,
//             message: 'Zipcode retrieved successfully',
//             data: zipcode
//         });
//     } catch (error) {
//         console.error('Error fetching zipcode:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to fetch zipcode'
//         });
//     }
// };

// // 5. READ - Check if zipcode exists (for service availability)
// const checkZipcodeAvailability = async (req, res) => {
//     try {
//         const { zipcode } = req.params;

//         if (!zipcode) return res.status(400).json({success: false,message: 'Zipcode parameter is required'});
        

//         const exists = await Zipcode.findOne({zipcode: zipcode.trim()});

//         res.status(200).json({
//             success: true,
//             message: exists ? 'Service available in this area' : 'Service not available in this area',
//             data: {
//                 zipcode: zipcode.trim(),
//                 isServiceable: !!exists,
//                 available: !!exists
//             }
//         });
//     } catch (error) {
//         console.error('Error checking zipcode:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to check zipcode availability'
//         });
//     }
// };

// // 6. UPDATE - Update zipcode
// const updateZipcode = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { zipcode } = req.body;

//         if (!zipcode) return res.status(400).json({success: false,message: 'Zipcode is required for update'});
        
//         const existing = await Zipcode.findOne({zipcode: zipcode.trim(), _id: { $ne: id }});

//         if (existing) return res.status(409).json({success: false,message: 'Zipcode already exists'});
        

//         // Update zipcode
//         const updatedZipcode = await Zipcode.findByIdAndUpdate(
//             id,
//             {
//                 zipcode: zipcode.trim(),
//                 updatedAt: Date.now()
//             },
//             { new: true, runValidators: true }
//         );

//         if (!updatedZipcode) return res.status(404).json({success: false,message: 'Zipcode not found'});

//         res.status(200).json({
//             success: true,
//             message: 'Zipcode updated successfully',
//             data: updatedZipcode
//         });
//     } catch (error) {
//         console.error('Error updating zipcode:', error);

//         if (error.code === 11000) return res.status(409).json({success: false,message: 'Zipcode already exists'});

//         res.status(500).json({
//             success: false,
//             message: 'Failed to update zipcode'
//         });
//     }
// };

// // 7. DELETE - Delete zipcode
// const deleteZipcode = async (req, res) => {
//     try {
//         const { id } = req.params;

//         const deletedZipcode = await Zipcode.findByIdAndDelete(id);

//         if (!deletedZipcode) return res.status(404).json({success: false,message: 'Zipcode not found'});

//         res.status(200).json({
//             success: true,
//             message: 'Zipcode deleted successfully',
//         });
//     } catch (error) {
//         console.error('Error deleting zipcode:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to delete zipcode'
//         });
//     }
// };

// // 8. BULK DELETE - Delete multiple zipcodes
// const bulkDeleteZipcodes = async (req, res) => {
//     try {
//         const { zipcode } = req.body; // Array of IDs

//         if (!Array.isArray(zipcode) || zipcode.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Array of zipcode IDs is required'
//             });
//         }

//         const result = await Zipcode.deleteMany({ _id: { $in: zipcode } });

//         res.status(200).json({
//             success: true,
//             message: 'Zipcodes deleted successfully',
//         });
//     } catch (error) {
//         console.error('Error bulk deleting zipcodes:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to delete zipcodes'
//         });
//     }
// };

// module.exports = {
//     createZipcode,
//     bulkCreateZipcodes,
//     getAllZipcodes,
//     getZipcodeById,
//     checkZipcodeAvailability,
//     updateZipcode,
//     deleteZipcode,
//     bulkDeleteZipcodes
// };



const Zipcode = require('../models/zipcode'); // Adjust path as needed
const City = require('../models/city'); // You'll need this to validate city_id
const { NODE_ENV } = require('../env-variables');

// 1. CREATE - Add a single zipcode
const createZipcode = async (req, res) => {
    try {
        const { zipcode, city_id, is_deliverable } = req.body;

        // Validate required fields
        if (!zipcode) {
            return res.status(400).json({
                success: false,
                message: 'Zipcode is required'
            });
        }
        
        if (!city_id) {
            return res.status(400).json({
                success: false,
                message: 'City ID is required'
            });
        }

        // Check if city exists
        const city = await City.findById(city_id);
        if (!city) {
            return res.status(404).json({
                success: false,
                message: 'City not found'
            });
        }

        // Check for existing zipcode
        const existingZipcode = await Zipcode.findOne({ zipcode: zipcode.trim() });
        if (existingZipcode) {
            return res.status(409).json({
                success: false,
                message: 'Zipcode already exists'
            });
        }
        
        const newZipcode = await Zipcode.create({
            zipcode: zipcode.trim(),
            city_id,
            is_deliverable: is_deliverable !== undefined ? is_deliverable : true
        });

        // Populate city details for response
        await newZipcode.populate('city_id', 'name');

        res.status(201).json({
            success: true,
            message: 'Zipcode added successfully',
            data: newZipcode
        });
    } catch (error) {
        console.error('Error creating zipcode:', error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Zipcode already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to add zipcode',
            error: NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// 2. BULK CREATE - Add multiple zipcodes at once
const bulkCreateZipcodes = async (req, res) => {
    try {
        const { zipcodes } = req.body; // Changed from 'zipcode' to 'zipcodes' for clarity

        if (!Array.isArray(zipcodes) || zipcodes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Array of zipcodes is required'
            });
        }

        // Validate each zipcode has required fields
        const invalidZipcodes = zipcodes.filter(z => !z.zipcode || !z.city_id);
        if (invalidZipcodes.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Each zipcode must have zipcode and city_id fields',
                invalidZipcodes
            });
        }

        // Check if all city_ids exist
        const cityIds = [...new Set(zipcodes.map(z => z.city_id))];
        const cities = await City.find({ _id: { $in: cityIds } });
        
        if (cities.length !== cityIds.length) {
            const foundCityIds = cities.map(c => c._id.toString());
            const missingCityIds = cityIds.filter(id => !foundCityIds.includes(id.toString()));
            
            return res.status(404).json({
                success: false,
                message: 'One or more city IDs not found',
                missingCityIds
            });
        }

        // Clean and prepare zipcodes
        const zipcodesToInsert = zipcodes.map(z => ({
            zipcode: z.zipcode.trim(),
            city_id: z.city_id,
            is_deliverable: z.is_deliverable !== undefined ? z.is_deliverable : true
        }));

        // Check for existing zipcodes
        const zipcodeStrings = zipcodesToInsert.map(z => z.zipcode);
        const existing = await Zipcode.find({ 
            zipcode: { $in: zipcodeStrings } 
        });

        const existingSet = new Set(existing.map(z => z.zipcode));
        const newZipcodes = zipcodesToInsert.filter(z => !existingSet.has(z.zipcode));

        // Insert new zipcodes
        let insertedZipcodes = [];
        if (newZipcodes.length > 0) {
            insertedZipcodes = await Zipcode.insertMany(newZipcodes, { 
                ordered: false 
            });
        }

        // Populate city details for response
        await Zipcode.populate(insertedZipcodes, { path: 'city_id', select: 'name' });

        res.status(201).json({
            success: true,
            message: 'Zipcodes processed successfully',
            data: {
                totalRequested: zipcodes.length,
                successfullyInserted: insertedZipcodes.length,
                alreadyExists: existing.length,
                failed: zipcodes.length - insertedZipcodes.length - existing.length
            },
            inserted: insertedZipcodes,
            existing: existing.map(z => ({ zipcode: z.zipcode, city_id: z.city_id }))
        });
    } catch (error) {
        console.error('Error bulk creating zipcodes:', error);
        
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Duplicate zipcode entries found',
                details: error.writeErrors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to process zipcodes',
            error: NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// 3. READ - Get all zipcodes (with pagination)
const getAllZipcodes = async (req, res) => {
    const { limit, offset, sort, searchQuery, filters } = req.paginationQuery;
    
    try {
        const finalQuery = { ...searchQuery, ...filters };

        // Get total count for pagination
        const total = await Zipcode.countDocuments(finalQuery);

        // Get paginated results with city details
        const zipcodes = await Zipcode.find(finalQuery)
            .populate('city_id', 'name') // Populate city name
            .sort(sort)
            .skip(offset)
            .limit(limit)
            .lean();
        
        const currentPage = Math.floor(offset / limit) + 1;

        res.status(200).json({
            success: true,
            message: 'Zipcodes retrieved successfully',
            data: {
                zipcodes,
                pagination: {
                    currentPage,
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: limit,
                    hasNextPage: offset + limit < total,
                    hasPreviousPage: offset > 0
                }
            }
        });
    } catch (error) {
        console.error('Error fetching zipcodes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch zipcodes'
        });
    }
};

// 4. READ - Get single zipcode by ID
const getZipcodeById = async (req, res) => {
    try {
        const { id } = req.params;

        const zipcode = await Zipcode.findById(id)
            .populate('city_id', 'name');

        if (!zipcode) {
            return res.status(404).json({
                success: false,
                message: 'Zipcode not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Zipcode retrieved successfully',
            data: zipcode
        });
    } catch (error) {
        console.error('Error fetching zipcode:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch zipcode'
        });
    }
};

// 5. READ - Check if zipcode exists (for service availability)
const checkZipcodeAvailability = async (req, res) => {
    try {
        const { zipcode } = req.params;

        if (!zipcode) {
            return res.status(400).json({
                success: false,
                message: 'Zipcode parameter is required'
            });
        }

        const zipcodeDoc = await Zipcode.findOne({ 
            zipcode: zipcode.trim(),
            is_deliverable: true 
        }).populate('city_id', 'name');

        res.status(200).json({
            success: true,
            message: zipcodeDoc ? 'Service available in this area' : 'Service not available in this area',
            data: {
                zipcode: zipcode.trim(),
                isServiceable: !!zipcodeDoc,
                city: zipcodeDoc ? zipcodeDoc.city_id : null,
                deliveryAvailable: !!zipcodeDoc
            }
        });
    } catch (error) {
        console.error('Error checking zipcode:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check zipcode availability'
        });
    }
};

// 6. UPDATE - Update zipcode
const updateZipcode = async (req, res) => {
    try {
        const { id } = req.params;
        const { zipcode, city_id, is_deliverable } = req.body;

        // Build update object
        const updateData = {};
        if (zipcode) updateData.zipcode = zipcode.trim();
        if (city_id) {
            // Verify city exists
            const city = await City.findById(city_id);
            if (!city) {
                return res.status(404).json({
                    success: false,
                    message: 'City not found'
                });
            }
            updateData.city_id = city_id;
        }
        if (is_deliverable !== undefined) updateData.is_deliverable = is_deliverable;
        
        updateData.updatedAt = Date.now();

        // Check for duplicate zipcode if updating zipcode
        if (zipcode) {
            const existing = await Zipcode.findOne({ 
                zipcode: zipcode.trim(), 
                _id: { $ne: id } 
            });

            if (existing) {
                return res.status(409).json({
                    success: false,
                    message: 'Zipcode already exists'
                });
            }
        }

        // Update zipcode
        const updatedZipcode = await Zipcode.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('city_id', 'name');

        if (!updatedZipcode) {
            return res.status(404).json({
                success: false,
                message: 'Zipcode not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Zipcode updated successfully',
            data: updatedZipcode
        });
    } catch (error) {
        console.error('Error updating zipcode:', error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Zipcode already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update zipcode',
            error: NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// 7. DELETE - Delete zipcode
const deleteZipcode = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if zipcode is used in any areas (if you have Area model)
        // const areasUsingZipcode = await Area.countDocuments({ zipcode_id: id });
        // if (areasUsingZipcode > 0) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Cannot delete zipcode as it is associated with one or more areas'
        //     });
        // }

        const deletedZipcode = await Zipcode.findByIdAndDelete(id);

        if (!deletedZipcode) {
            return res.status(404).json({
                success: false,
                message: 'Zipcode not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Zipcode deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting zipcode:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete zipcode'
        });
    }
};

// 8. BULK DELETE - Delete multiple zipcodes
const bulkDeleteZipcodes = async (req, res) => {
    try {
        const { ids } = req.body; // Changed from 'zipcode' to 'ids' for clarity

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Array of zipcode IDs is required'
            });
        }

        // Check if any zipcodes are in use (if you have Area model)
        // const areasUsingZipcodes = await Area.countDocuments({ zipcode_id: { $in: ids } });
        // if (areasUsingZipcodes > 0) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Cannot delete zipcodes that are associated with areas'
        //     });
        // }

        const result = await Zipcode.deleteMany({ _id: { $in: ids } });

        res.status(200).json({
            success: true,
            message: 'Zipcodes deleted successfully',
            data: {
                deletedCount: result.deletedCount
            }
        });
    } catch (error) {
        console.error('Error bulk deleting zipcodes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete zipcodes'
        });
    }
};

// 9. GET ZIPCODES BY CITY - New utility function
const getZipcodesByCity = async (req, res) => {
    try {
        const { cityId } = req.params;
        console.log("city.params", cityId)

        const zipcodes = await Zipcode.find({ 
            city_id: cityId,
            is_deliverable: true 
        }).populate('city_id', 'name');

        res.status(200).json({
            success: true,
            message: 'Zipcodes retrieved successfully',
            data: zipcodes
        });
    } catch (error) {
        console.error('Error fetching zipcodes by city:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch zipcodes'
        });
    }
};

module.exports = {
    createZipcode,
    bulkCreateZipcodes,
    getAllZipcodes,
    getZipcodeById,
    checkZipcodeAvailability,
    updateZipcode,
    deleteZipcode,
    bulkDeleteZipcodes,
    getZipcodesByCity // New export
};