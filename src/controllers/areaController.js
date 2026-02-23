const Area = require('../models/area');
const City = require('../models/city');
const Zipcode = require('../models/zipcode');
const mongoose = require('mongoose');

/**
 * AREA CRUD CONTROLLER
 */

// 1. CREATE - Add new area
const createArea = async (req, res) => {
    try {
        const { 
            city_id, 
            zipcode_id, 
            name, 
            minimum_free_delivery_order_amount, 
            delivery_charges
        } = req.body;
        
        // // Validate required fields
        // if (!city_id || !name) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'City ID and Area name are required'
        //     });
        // }

        // Check if city exists
        const cityExists = await City.findById(city_id);
        if (!cityExists) {
            return res.status(404).json({
                success: false,
                message: 'City not found'
            });
        }

        // Check if zipcode exists if provided
        if (zipcode_id) {
            const zipcodeExists = await Zipcode.findById(zipcode_id);
            if (!zipcodeExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Zipcode not found'
                });
            }
        }

        // Create new area
        const newArea = await Area.create({
            city_id,
            zipcode_id: zipcode_id || null,
            name: name.trim(),
            minimum_free_delivery_order_amount: minimum_free_delivery_order_amount || 100,
            delivery_charges: delivery_charges || 0,
        });

        // Populate references for response
        const populatedArea = await Area.findById(newArea._id)
            .populate('city_id', 'name state')
            .populate('zipcode_id', 'zipcode')
            .lean();

        res.status(201).json({
            success: true,
            message: 'Area created successfully',
            data: populatedArea
        });
    } catch (error) {
        console.error('Error creating area:', error);
        
        // Handle duplicate area name in same city
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: `Area ${req.body.name} already exists in this city`
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to create area',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// 2. READ - Get all areas with filtering and pagination
const getAllAreas = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        
        // Build filter query
        let query = {};
        
        // Filter by city_id
        if (req.query.city_id) {
            if (!mongoose.Types.ObjectId.isValid(req.query.city_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid City ID format'
                });
            }
            query.city_id = req.query.city_id;
        }
        
        // Filter by active status
        if (req.query.active !== undefined) {
            query.active = req.query.active === 'true';
        }
        
        // Search by area name
        if (req.query.search) {
            query.name = { $regex: req.query.search, $options: 'i' };
        }
        
        // Filter by delivery charges range
        if (req.query.min_charges || req.query.max_charges) {
            query.delivery_charges = {};
            if (req.query.min_charges) {
                query.delivery_charges.$gte = parseFloat(req.query.min_charges);
            }
            if (req.query.max_charges) {
                query.delivery_charges.$lte = parseFloat(req.query.max_charges);
            }
        }
        
        // Get total count for pagination
        const total = await Area.countDocuments(query);
        
        // Get paginated results with populated references
        const areas = await Area.find(query)
            .populate('city_id', 'name state country')
            .populate('zipcode_id', 'zipcode')
            .sort({ createdAt: -1, name: 1 })
            .skip(skip)
            .limit(limit)
            .lean();
        
        res.status(200).json({
            success: true,
            message: 'Areas retrieved successfully',
            data: {
                areas,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: limit,
                    hasNextPage: page < Math.ceil(total / limit),
                    hasPreviousPage: page > 1
                },
                summary: {
                    total_areas: total,
                    active_areas: await Area.countDocuments({ ...query, active: true }),
                    areas_with_delivery_charges: await Area.countDocuments({ ...query, delivery_charges: { $gt: 0 } })
                }
            }
        });
    } catch (error) {
        console.error('Error fetching areas:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch areas'
        });
    }
};

// 3. READ - Get area by ID
const getAreaById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get area with populated references
        const area = await Area.findById(id)
            .populate('city_id', 'name state country')
            .populate('zipcode_id', 'zipcode')
            .lean();
        
        if (!area) {
            return res.status(404).json({
                success: false,
                message: 'Area not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Area retrieved successfully',
            data: area
        });
    } catch (error) {
        console.error('Error fetching area:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch area'
        });
    }
};

// 4. READ - Get areas by city ID
const getAreasByCity = async (req, res) => {
    try {
        const { city_id } = req.params;
        
        // Check if city exists
        const city = await City.findById(city_id);
        if (!city) {
            return res.status(404).json({
                success: false,
                message: 'City not found'
            });
        }
        
        // Get only active areas by default (for checkout/delivery purposes)
        const activeOnly = req.query.active_only !== 'false';
        let query = { city_id, active: true };
        
        if (!activeOnly) {
            query = { city_id };
        }
        
        const areas = await Area.find(query)
            .populate('zipcode_id', 'zipcode')
            .select('name delivery_charges minimum_free_delivery_order_amount active')
            .sort({ name: 1 })
            .lean();
        
        res.status(200).json({
            success: true,
            message: `Areas for ${city.name} retrieved successfully`,
            data: {
                city: {
                    id: city._id,
                    name: city.name,
                    state: city.state
                },
                areas: areas.map(area => ({
                    id: area._id,
                    name: area.name,
                    delivery_charges: area.delivery_charges,
                    minimum_order_for_free_delivery: area.minimum_free_delivery_order_amount,
                    is_active: area.active,
                    zipcode: area.zipcode_id?.zipcode || null
                })),
                summary: {
                    total_areas: areas.length,
                    serviceable_areas: areas.filter(a => a.active).length,
                    average_delivery_charge: areas.length > 0 
                        ? areas.reduce((sum, a) => sum + a.delivery_charges, 0) / areas.length 
                        : 0
                }
            }
        });
    } catch (error) {
        console.error('Error fetching areas by city:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch areas'
        });
    }
};

// 5. UPDATE - Update area
const updateArea = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Area ID format'
            });
        }
        
        // Check if area exists
        const existingArea = await Area.findById(id);
        if (!existingArea) {
            return res.status(404).json({
                success: false,
                message: 'Area not found'
            });
        }
        
        // If city_id is being updated, validate new city
        if (updateData.city_id && updateData.city_id !== existingArea.city_id.toString()) {
            if (!mongoose.Types.ObjectId.isValid(updateData.city_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid City ID format'
                });
            }
            const cityExists = await City.findById(updateData.city_id);
            if (!cityExists) {
                return res.status(404).json({
                    success: false,
                    message: 'City not found'
                });
            }
        }
        
        // If zipcode_id is being updated, validate new zipcode
        if (updateData.zipcode_id && updateData.zipcode_id !== existingArea.zipcode_id?.toString()) {
            if (!mongoose.Types.ObjectId.isValid(updateData.zipcode_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Zipcode ID format'
                });
            }
            const zipcodeExists = await Zipcode.findById(updateData.zipcode_id);
            if (!zipcodeExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Zipcode not found'
                });
            }
        }
        
        // Trim name if provided
        if (updateData.name) {
            updateData.name = updateData.name.trim();
        }
        
        // Update the area
        const updatedArea = await Area.findByIdAndUpdate(
            id,
            { ...updateData, updatedAt: Date.now() },
            { new: true, runValidators: true }
        )
        .populate('city_id', 'name state')
        .populate('zipcode_id', 'zipcode')
        .lean();
        
        res.status(200).json({
            success: true,
            message: 'Area updated successfully',
            data: updatedArea
        });
    } catch (error) {
        console.error('Error updating area:', error);
        
        // Handle duplicate area name in same city
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Area name already exists in this city'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to update area'
        });
    }
};

// 6. UPDATE - Toggle area active status
const toggleAreaStatus = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Area ID format'
            });
        }
        
        const area = await Area.findById(id);
        if (!area) {
            return res.status(404).json({
                success: false,
                message: 'Area not found'
            });
        }
        
        // Toggle active status
        const updatedArea = await Area.findByIdAndUpdate(
            id,
            { active: !area.active, updatedAt: Date.now() },
            { new: true }
        )
        .populate('city_id', 'name')
        .lean();
        
        res.status(200).json({
            success: true,
            message: `Area ${updatedArea.active ? 'activated' : 'deactivated'} successfully`,
            data: {
                id: updatedArea._id,
                name: updatedArea.name,
                city: updatedArea.city_id.name,
                active: updatedArea.active,
                status_changed_at: updatedArea.updatedAt
            }
        });
    } catch (error) {
        console.error('Error toggling area status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update area status'
        });
    }
};

// 7. DELETE - Delete area
const deleteArea = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Area ID format'
            });
        }
        
        const deletedArea = await Area.findByIdAndDelete(id);
        
        if (!deletedArea) {
            return res.status(404).json({
                success: false,
                message: 'Area not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Area deleted successfully',
            data: {
                id: deletedArea._id,
                name: deletedArea.name,
                deleted_at: new Date()
            }
        });
    } catch (error) {
        console.error('Error deleting area:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete area'
        });
    }
};

// 8. UTILITY - Calculate delivery charges for an order
const calculateDeliveryCharges = async (req, res) => {
    try {
        const { area_id, order_amount } = req.body;
        
        if (!area_id || order_amount === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Area ID and order amount are required'
            });
        }
        
        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(area_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Area ID format'
            });
        }
        
        const area = await Area.findById(area_id)
            .populate('city_id', 'name')
            .lean();
        
        if (!area) {
            return res.status(404).json({
                success: false,
                message: 'Area not found'
            });
        }
        
        if (!area.active) {
            return res.status(400).json({
                success: false,
                message: 'Delivery not available in this area',
                data: {
                    serviceable: false,
                    area_name: area.name,
                    city: area.city_id.name
                }
            });
        }
        
        const orderAmount = parseFloat(order_amount);
        let deliveryCharges = 0;
        let isFreeDelivery = false;
        
        // Calculate delivery charges
        if (orderAmount < area.minimum_free_delivery_order_amount) {
            deliveryCharges = area.delivery_charges;
        } else {
            isFreeDelivery = true;
        }
        
        const totalAmount = orderAmount + deliveryCharges;
        
        res.status(200).json({
            success: true,
            message: 'Delivery charges calculated successfully',
            data: {
                area: {
                    id: area._id,
                    name: area.name,
                    city: area.city_id.name
                },
                order_summary: {
                    order_amount: orderAmount,
                    delivery_charges: deliveryCharges,
                    minimum_for_free_delivery: area.minimum_free_delivery_order_amount,
                    is_free_delivery: isFreeDelivery,
                    total_payable: totalAmount
                },
                serviceable: area.active
            }
        });
    } catch (error) {
        console.error('Error calculating delivery charges:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate delivery charges'
        });
    }
};

module.exports = {
    createArea,
    getAllAreas,
    getAreaById,
    getAreasByCity,
    updateArea,
    toggleAreaStatus,
    deleteArea,
    calculateDeliveryCharges
};