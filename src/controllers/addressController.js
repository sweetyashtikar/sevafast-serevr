const Address = require('../models/address');
const User = require('../models/User');
const City = require('../models/city');
const Area = require('../models/area');
const mongoose = require('mongoose');

/**
 * ADDRESS CRUD CONTROLLER
 */

// 1. CREATE - Add new address
const createAddress = async (req, res) => {
    const user_id = req.user._id
    try {
        const {
            city_id,
            area_id,
            name,
            type,
            mobile,
            alternate_mobile,
            address,
            landmark,
            pincode,
            state,
            country,
            country_code,
            location,
            is_default
        } = req.body;

        // Validate required fields
        const requiredFields = { user_id, city_id, mobile, address, pincode };
        const missingFields = Object.entries(requiredFields)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Validate ID formats
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid User ID format'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(city_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid City ID format'
            });
        }

        if (area_id && !mongoose.Types.ObjectId.isValid(area_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Area ID format'
            });
        }

        // Check if user exists
        const userExists = await User.findById(user_id);
        if (!userExists) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if city exists
        const cityExists = await City.findById(city_id);
        if (!cityExists) {
            return res.status(404).json({
                success: false,
                message: 'City not found'
            });
        }

        // Check if area exists if provided
        if (area_id) {
            const areaExists = await Area.findById(area_id);
            if (!areaExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Area not found'
                });
            }
        }

        // If this is set as default, unset any existing default address for this user
        if (is_default === true) {
            await Address.updateMany(
                { user_id, is_default: true },
                { $set: { is_default: false } }
            );
        }

        // Prepare location data
        let locationData = location;
        if (!locationData || !locationData.coordinates || locationData.coordinates.length !== 2) {
            locationData = {
                type: 'Point',
                coordinates: [0, 0] // Default coordinates
            };
        }

        // Create new address
        const newAddress = new Address({
            user_id,
            city_id,
            area_id: area_id || null,
            name: name?.trim() || userExists.username, // Default to username if name not provided
            type: type || 'Home',
            mobile: mobile.trim(),
            alternate_mobile: alternate_mobile?.trim() || null,
            address: address.trim(),
            landmark: landmark?.trim() || null,
            pincode: pincode.trim(),
            state: state?.trim() || cityExists.state || null,
            country: country || 'India',
            country_code: country_code || 91,
            location: locationData,
            is_default: is_default || false
        });

        await newAddress.save();

        // Populate references for response
        const populatedAddress = await Address.findById(newAddress._id)
            .populate('user_id', 'username email mobile')
            .populate('city_id', 'name state')
            .populate('area_id', 'name delivery_charges minimum_free_delivery_order_amount active')
            .lean();

        res.status(201).json({
            success: true,
            message: 'Address created successfully',
            data: populatedAddress
        });
    } catch (error) {
        console.error('Error creating address:', error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: messages
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to create address',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// 2. READ - Get all addresses for a user
const getUserAddresses = async (req, res) => {
    try {
        const user_id  = req.user._id;
        console.log("userid", user_id)
        const { 
            type, 
            only_serviceable = 'false',
            only_default = 'false',
            limit = 50,
            page = 1 
        } = req.query;


        // Check if user exists
        const userExists = await User.findById(user_id);
        if (!userExists) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Build query
        let query = { user_id };
        
        // Filter by address type
        if (type) {
            const typeValues = Array.isArray(type) ? type : [type];
            const normalizedTypes = typeValues.map(t => 
                t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
            );
            query.type = { $in: normalizedTypes };
        }

        // Filter by default address
        if (only_default === 'true') {
            query.is_default = true;
        }

        // Calculate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get total count
        const total = await Address.countDocuments(query);

        // Get addresses with populated references
        let addressesQuery = Address.find(query)
            .populate('city_id', 'name state')
            .populate({
                path: 'area_id',
                select: 'name delivery_charges minimum_free_delivery_order_amount active'
            })
            .sort({ is_default: -1, updatedAt: -1 });

        // Apply pagination
        addressesQuery = addressesQuery.skip(skip).limit(limitNum);

        const addresses = await addressesQuery.lean();

        // Filter serviceable addresses if requested
        let filteredAddresses = addresses;
        if (only_serviceable === 'true') {
            filteredAddresses = addresses.filter(addr => 
                addr.area_id && addr.area_id.active === true
            );
        }

        // Get default address
        const defaultAddress = addresses.find(addr => addr.is_default);

        // Count address types
        const addressTypes = {};
        addresses.forEach(addr => {
            addressTypes[addr.type] = (addressTypes[addr.type] || 0) + 1;
        });

        res.status(200).json({
            success: true,
            message: 'Addresses retrieved successfully',
            data: {
                user: {
                    id: userExists._id,
                    name: userExists.username,
                    email: userExists.email
                },
                addresses: filteredAddresses.map(addr => ({
                    ...addr,
                    serviceable: addr.area_id ? addr.area_id.active : false,
                    delivery_info: addr.area_id ? {
                        charges: addr.area_id.delivery_charges,
                        minimum_free_delivery: addr.area_id.minimum_free_delivery_order_amount
                    } : null
                })),
                // summary: {
                //     total_addresses: total,
                //     returned_addresses: filteredAddresses.length,
                //     default_address: defaultAddress || null,
                //     address_types: addressTypes,
                //     serviceable_addresses: addresses.filter(addr => 
                //         addr.area_id && addr.area_id.active
                //     ).length
                // },
                pagination: {
                    current_page: pageNum,
                    total_pages: Math.ceil(total / limitNum),
                    total_items: total,
                    items_per_page: limitNum,
                    has_next: pageNum < Math.ceil(total / limitNum),
                    has_previous: pageNum > 1
                }
            }
        });
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch addresses'
        });
    }
};

// 3. READ - Get address by ID
const getAddressById = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("get by id", req.params)

        // Get address with populated references
        const address = await Address.findById(id)
            .populate('user_id', 'username email mobile')
            .populate('city_id', 'name state country')
            .populate('area_id', 'name delivery_charges minimum_free_delivery_order_amount active')
            .lean();

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        // Check serviceability
        const serviceable = address.area_id ? address.area_id.active : false;

        // Enrich address with additional info
        const enrichedAddress = {
            ...address,
            delivery_serviceable: serviceable,
            delivery_details: address.area_id ? {
                area_name: address.area_id.name,
                delivery_charges: address.area_id.delivery_charges,
                free_delivery_threshold: address.area_id.minimum_free_delivery_order_amount,
                active: address.area_id.active
            } : null
        };

        res.status(200).json({
            success: true,
            message: 'Address retrieved successfully',
            data: enrichedAddress
        });
    } catch (error) {
        console.error('Error fetching address:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch address'
        });
    }
};

// 4. READ - Get user's default address
const getDefaultAddress = async (req, res) => {
    try {
        const user_id  = req.user._id;
        console.log("get default address", user_id)

        // Check if user exists
        const userExists = await User.findById(user_id);
        if (!userExists) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get default address
        const defaultAddress = await Address.findOne({ 
            user_id, 
            is_default: true 
        })
        .populate('city_id', 'name state')
        .populate('area_id', 'name delivery_charges minimum_free_delivery_order_amount active')
        .lean();

        if (!defaultAddress) {
            // Get most recent address as fallback
            const recentAddress = await Address.findOne({ user_id })
                .populate('city_id', 'name state')
                .populate('area_id', 'name delivery_charges minimum_free_delivery_order_amount active')
                .sort({ createdAt: -1 })
                .lean();

            if (!recentAddress) {
                return res.status(404).json({
                    success: false,
                    message: 'No addresses found for user'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Most recent address retrieved (no default set)',
                data: {
                    ...recentAddress,
                    is_default: false,
                    note: 'This is the most recent address, not marked as default'
                }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Default address retrieved successfully',
            data: defaultAddress
        });
    } catch (error) {
        console.error('Error fetching default address:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch default address'
        });
    }
};

// 5. UPDATE - Update address
const updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Address ID format'
            });
        }

        // Check if address exists
        const existingAddress = await Address.findById(id);
        if (!existingAddress) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        // Validate references if being updated
        if (updateData.user_id && updateData.user_id !== existingAddress.user_id.toString()) {
            if (!mongoose.Types.ObjectId.isValid(updateData.user_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid User ID format'
                });
            }
            const userExists = await User.findById(updateData.user_id);
            if (!userExists) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
        }

        if (updateData.city_id && updateData.city_id !== existingAddress.city_id.toString()) {
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

        if (updateData.area_id && updateData.area_id !== existingAddress.area_id?.toString()) {
            if (!mongoose.Types.ObjectId.isValid(updateData.area_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Area ID format'
                });
            }
            const areaExists = await Area.findById(updateData.area_id);
            if (!areaExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Area not found'
                });
            }
        }

        // If setting as default, unset other defaults for this user
        if (updateData.is_default === true) {
            const userIdToUpdate = updateData.user_id || existingAddress.user_id;
            await Address.updateMany(
                { 
                    user_id: userIdToUpdate,
                    is_default: true,
                    _id: { $ne: id }
                },
                { $set: { is_default: false } }
            );
        }

        // Clean update data
        const cleanUpdateData = {};
        const fieldsToClean = ['name', 'mobile', 'alternate_mobile', 'address', 'landmark', 'pincode', 'state'];
        
        fieldsToClean.forEach(field => {
            if (updateData[field] !== undefined) {
                cleanUpdateData[field] = typeof updateData[field] === 'string' 
                    ? updateData[field].trim() 
                    : updateData[field];
            }
        });

        // Add other fields
        const otherFields = ['type', 'country', 'country_code', 'location', 'is_default', 'user_id', 'city_id', 'area_id'];
        otherFields.forEach(field => {
            if (updateData[field] !== undefined) {
                cleanUpdateData[field] = updateData[field];
            }
        });

        // Update the address
        const updatedAddress = await Address.findByIdAndUpdate(
            id,
            { 
                ...cleanUpdateData,
                updatedAt: Date.now()
            },
            { 
                new: true, 
                runValidators: true 
            }
        )
        .populate('user_id', 'username email')
        .populate('city_id', 'name state')
        .populate('area_id', 'name delivery_charges')
        .lean();

        res.status(200).json({
            success: true,
            message: 'Address updated successfully',
            data: updatedAddress
        });
    } catch (error) {
        console.error('Error updating address:', error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: messages
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to update address'
        });
    }
};

// 6. UPDATE - Set address as default
const setDefaultAddress = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if address exists
        const address = await Address.findById(id);
        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        // Unset all other default addresses for this user
        await Address.updateMany(
            { 
                user_id: address.user_id,
                is_default: true,
                _id: { $ne: id }
            },
            { $set: { is_default: false } }
        );

        // Set this address as default
        const updatedAddress = await Address.findByIdAndUpdate(
            id,
            { 
                is_default: true,
                updatedAt: Date.now()
            },
            { new: true }
        )
        .populate('city_id', 'name')
        .populate('area_id', 'name')
        .lean();

        res.status(200).json({
            success: true,
            message: 'Address set as default successfully',
            data: updatedAddress
        });
    } catch (error) {
        console.error('Error setting default address:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set default address'
        });
    }
};

// 7. DELETE - Delete address
const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Address ID format'
            });
        }

        // Check if address exists
        const address = await Address.findById(id);
        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        const wasDefault = address.is_default;
        const userId = address.user_id;

        // Delete the address
        await Address.findByIdAndDelete(id);

        // If deleted address was default, set another address as default
        let newDefaultAddress = null;
        if (wasDefault) {
            const anotherAddress = await Address.findOne({ user_id: userId })
                .sort({ createdAt: -1 });

            if (anotherAddress) {
                await Address.findByIdAndUpdate(
                    anotherAddress._id,
                    { is_default: true }
                );
                newDefaultAddress = anotherAddress._id;
            }
        }

        res.status(200).json({
            success: true,
            message: 'Address deleted successfully',
            data: {
                id,
                was_default: wasDefault,
                default_updated: wasDefault ? 'New default address set' : 'No change needed',
                new_default_address_id: newDefaultAddress,
                deleted_at: new Date()
            }
        });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete address'
        });
    }
};

//not tested
// 8. GEOSPATIAL - Find addresses near location
const findNearbyAddresses = async (req, res) => {
    try {
        const { longitude, latitude, max_distance = 5000, user_id } = req.body; // max_distance in meters

        if (!longitude || !latitude) {
            return res.status(400).json({
                success: false,
                message: 'Longitude and latitude are required'
            });
        }

        const lon = parseFloat(longitude);
        const lat = parseFloat(latitude);
        const maxDist = parseFloat(max_distance);

        if (isNaN(lon) || isNaN(lat) || isNaN(maxDist)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coordinates or distance'
            });
        }

        // Build geospatial query
        const geoQuery = {
            'location.coordinates': {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lon, lat]
                    },
                    $maxDistance: maxDist
                }
            }
        };

        // Add user filter if provided
        if (user_id) {
            if (!mongoose.Types.ObjectId.isValid(user_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid User ID format'
                });
            }
            geoQuery.user_id = user_id;
        }

        const nearbyAddresses = await Address.find(geoQuery)
            .populate('user_id', 'username')
            .populate('city_id', 'name')
            .populate('area_id', 'name')
            .limit(100)
            .lean();

        // Calculate distances and enrich data
        const addressesWithDistance = nearbyAddresses.map(addr => {
            const [addrLon, addrLat] = addr.location.coordinates;
            const distance = calculateDistance(lat, lon, addrLat, addrLon);
            
            return {
                ...addr,
                distance: {
                    meters: Math.round(distance * 1000),
                    kilometers: distance.toFixed(2),
                    miles: (distance * 0.621371).toFixed(2)
                }
            };
        });

        // Sort by distance
        addressesWithDistance.sort((a, b) => a.distance.meters - b.distance.meters);

        res.status(200).json({
            success: true,
            message: 'Nearby addresses found',
            data: {
                search_location: { 
                    longitude: lon, 
                    latitude: lat 
                },
                search_radius: {
                    meters: maxDist,
                    kilometers: (maxDist / 1000).toFixed(2)
                },
                results: {
                    total: addressesWithDistance.length,
                    addresses: addressesWithDistance
                }
            }
        });
    } catch (error) {
        console.error('Error finding nearby addresses:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to find nearby addresses'
        });
    }
};

// 9. BULK - Create multiple addresses
const bulkCreateAddresses = async (req, res) => {
    try {
        const user_id = req.user._id
        const { addresses } = req.body;

        if (!Array.isArray(addresses) || addresses.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Array of addresses is required'
            });
        }

        // Limit bulk operations
        if (addresses.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 100 addresses per bulk operation'
            });
        }

        const results = {
            success: [],
            failed: []
        };

        // Process addresses sequentially
        for (const addressData of addresses) {
            try {
                // Validate required fields
                const required = [ 'city_id', 'mobile', 'address', 'pincode'];
                const missing = required.filter(field => !addressData[field]);
                
                if (missing.length > 0) {
                    results.failed.push({
                        data: addressData,
                        error: `Missing fields: ${missing.join(', ')}`
                    });
                    continue;
                }

                // Create address
                const address = new Address({
                    ...addressData,
                    user_id: user_id,
                    name: addressData.name?.trim() || '',
                    mobile: addressData.mobile.trim(),
                    address: addressData.address.trim(),
                    pincode: addressData.pincode.trim(),
                    location: addressData.location || {
                        type: 'Point',
                        coordinates: [0, 0]
                    }
                });

                await address.save();
                results.success.push(address._id);
            } catch (error) {
                results.failed.push({
                    data: addressData,
                    error: error.message
                });
            }
        }

        res.status(201).json({
            success: true,
            message: 'Bulk address creation completed',
            data: {
                total_processed: addresses.length,
                successful: results.success.length,
                failed: results.failed.length,
                success_ids: results.success,
                failures: results.failed
            }
        });
    } catch (error) {
        console.error('Error in bulk create:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create addresses in bulk'
        });
    }
};

// Helper function: Calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
}

//get the user address for admin by id of user
const getUserAddressesByAdmin = async (req, res) => {
    try {

        const { user_id } = req.params;

        const { 
            type, 
            only_serviceable = 'false',
            only_default = 'false',
            limit = 50,
            page = 1 
        } = req.query;

        // ✅ Optional: Ensure admin access
        // if (req.user.role !== 'admin') {
        //     return res.status(403).json({
        //         success: false,
        //         message: "Access denied"
        //     });
        // }

        // ✅ Check if user exists
        const userExists = await User.findById(user_id);
        if (!userExists) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // ✅ Build query (NO req.user._id)
        let query = { user_id };

        if (type) {
            const typeValues = Array.isArray(type) ? type : [type];
            const normalizedTypes = typeValues.map(t => 
                t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
            );
            query.type = { $in: normalizedTypes };
        }

        if (only_default === 'true') {
            query.is_default = true;
        }

        // ✅ Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const total = await Address.countDocuments(query);

        let addressesQuery = Address.find(query)
            .populate('city_id', 'name state')
            .populate({
                path: 'area_id',
                select: 'name delivery_charges minimum_free_delivery_order_amount active'
            })
            .sort({ is_default: -1, updatedAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const addresses = await addressesQuery.lean();

        // ✅ Serviceable filter
        let filteredAddresses = addresses;
        if (only_serviceable === 'true') {
            filteredAddresses = addresses.filter(addr => 
                addr.area_id && addr.area_id.active === true
            );
        }

        res.status(200).json({
            success: true,
            message: 'User addresses retrieved successfully',
            data: {
                user: {
                    id: userExists._id,
                    name: userExists.username,
                    email: userExists.email
                },
                addresses: filteredAddresses.map(addr => ({
                    ...addr,
                    serviceable: addr.area_id ? addr.area_id.active : false,
                    delivery_info: addr.area_id ? {
                        charges: addr.area_id.delivery_charges,
                        minimum_free_delivery: addr.area_id.minimum_free_delivery_order_amount
                    } : null
                })),
                pagination: {
                    current_page: pageNum,
                    total_pages: Math.ceil(total / limitNum),
                    total_items: total,
                    items_per_page: limitNum,
                    has_next: pageNum < Math.ceil(total / limitNum),
                    has_previous: pageNum > 1
                }
            }
        });

    } catch (error) {
        console.error('Error fetching user addresses', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user addresses'
        });
    }
};

//for admin
const getAllUserAddresses = async (req, res) => {
    try {

        const { limit = 50, page = 1 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Fetch all addresses with user info
        const total = await Address.countDocuments();

        const addresses = await Address.find({})
            .populate('user_id', 'username email')
            .populate('city_id', 'name state')
            .populate({
                path: 'area_id',
                select: 'name delivery_charges minimum_free_delivery_order_amount active'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        res.status(200).json({
            success: true,
            data: addresses,
            pagination: {
                current_page: pageNum,
                total_pages: Math.ceil(total / limitNum),
                total_items: total
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch all addresses"
        });
    }
};

module.exports = {
    createAddress,
    getUserAddresses,
    getAddressById,
    getDefaultAddress,
    updateAddress,
    setDefaultAddress,
    deleteAddress,
    findNearbyAddresses,
    bulkCreateAddresses,
    getUserAddressesByAdmin,
    getAllUserAddresses
};