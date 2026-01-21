const Zipcode = require('../models/zipcode'); // Adjust path as needed
const {NODE_ENV} = require('../env-variables')


const createZipcode = async (req, res) => {
    try {
        const { zipcode } = req.body;

        if (!zipcode) return res.status(400).json({success: false,message: 'Zipcode is required'});
        
        const existingZipcode = await Zipcode.findOne({ zipcode });
        if (existingZipcode) return res.status(409).json({success: false,message: 'Zipcode already exists'});
        
        const newZipcode = await Zipcode.create({zipcode: zipcode.trim()});

        res.status(201).json({
            success: true,
            message: 'Zipcode added successfully',
            data: newZipcode
        });
    } catch (error) {
        console.error('Error creating zipcode:', error);

        if (error.code === 11000) return res.status(409).json({ success: false, message: 'Zipcode already exists'});

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
        const { zipcode } = req.body;

        if (!Array.isArray(zipcode) || zipcode.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Array of zipcodes is required'
            });
        }

        // Clean and deduplicate zipcodes
        const uniqueZipcodes = [...new Set(zipcode.map(z => z.trim()))];

        // Check for existing zipcodes
        const existing = await Zipcode.find({zipcode: { $in: uniqueZipcodes }});

        const existingSet = new Set(existing.map(z => z.zipcode));
        const newZipcodes = uniqueZipcodes.filter(z => !existingSet.has(z)).map(zipcode => ({ zipcode }));

        // Insert new zipcodes
        let insertedZipcodes = [];
        if (newZipcodes.length > 0) {
            insertedZipcodes = await Zipcode.insertMany(newZipcodes, { ordered: false });
        }

        res.status(201).json({
            success: true,
            message: 'Zipcodes processed successfully',
            data: {
                totalRequested: zipcode.length,
                uniqueProvided: uniqueZipcodes.length,
                alreadyExists: existing.length,
                newlyAdded: insertedZipcodes.length,
                duplicatesIgnored: zipcode.length - uniqueZipcodes.length
            },
            added: insertedZipcodes
        });
    } catch (error) {
        console.error('Error bulk creating zipcodes:', error);
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

        // Get paginated results
        const zipcodes = await Zipcode.find(finalQuery)
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
                    currentPage: page,
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

        const zipcode = await Zipcode.findById(id);

        if (!zipcode) return res.status(404).json({success: false,message: 'Zipcode not found'});

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

        if (!zipcode) return res.status(400).json({success: false,message: 'Zipcode parameter is required'});
        

        const exists = await Zipcode.findOne({zipcode: zipcode.trim()});

        res.status(200).json({
            success: true,
            message: exists ? 'Service available in this area' : 'Service not available in this area',
            data: {
                zipcode: zipcode.trim(),
                isServiceable: !!exists,
                available: !!exists
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
        const { zipcode } = req.body;

        if (!zipcode) return res.status(400).json({success: false,message: 'Zipcode is required for update'});
        
        const existing = await Zipcode.findOne({zipcode: zipcode.trim(), _id: { $ne: id }});

        if (existing) return res.status(409).json({success: false,message: 'Zipcode already exists'});
        

        // Update zipcode
        const updatedZipcode = await Zipcode.findByIdAndUpdate(
            id,
            {
                zipcode: zipcode.trim(),
                updatedAt: Date.now()
            },
            { new: true, runValidators: true }
        );

        if (!updatedZipcode) return res.status(404).json({success: false,message: 'Zipcode not found'});

        res.status(200).json({
            success: true,
            message: 'Zipcode updated successfully',
            data: updatedZipcode
        });
    } catch (error) {
        console.error('Error updating zipcode:', error);

        if (error.code === 11000) return res.status(409).json({success: false,message: 'Zipcode already exists'});

        res.status(500).json({
            success: false,
            message: 'Failed to update zipcode'
        });
    }
};

// 7. DELETE - Delete zipcode
const deleteZipcode = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedZipcode = await Zipcode.findByIdAndDelete(id);

        if (!deletedZipcode) return res.status(404).json({success: false,message: 'Zipcode not found'});

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
        const { zipcode } = req.body; // Array of IDs

        if (!Array.isArray(zipcode) || zipcode.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Array of zipcode IDs is required'
            });
        }

        const result = await Zipcode.deleteMany({ _id: { $in: zipcode } });

        res.status(200).json({
            success: true,
            message: 'Zipcodes deleted successfully',
        });
    } catch (error) {
        console.error('Error bulk deleting zipcodes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete zipcodes'
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
    bulkDeleteZipcodes
};