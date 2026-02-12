const DeliveryBoy = require('../models/deliveryBoy')
const User = require('../models/User')
const mongoose = require('mongoose')

/**
 * Create minimal delivery boy profile - Only inserts user_id and vendor_id
 * All other details will be filled later by the vendor
 */
const createDeliveryBoyProfile = async (userId, vendorId) => {
  try {
    // ✅ Create minimal delivery boy profile with ONLY user_id and vendor_id
    const deliveryBoyData = {
      user_id: userId,
      vendor_id: vendorId,
      
      // Initialize with empty/default values - vendor will fill later
      personal_details: {
        full_name: null,
        email: null,
        mobile: null,
        alternate_mobile: null,
        profile_image: null,
        date_of_birth: null,
        gender: null,
        address: {
          street: null,
          city: null,
          state: null,
          pincode: null,
          country: 'India',
          coordinates: [0, 0]
        }
      },
      
      verification: {
        aadhar_number: null,
        aadhar_verified: false,
        aadhar_front_image: null,
        aadhar_back_image: null,
        pan_number: null,
        pan_verified: false,
        pan_image: null,
        driving_license: {
          license_number: null,
          verified: false,
          front_image: null,
          back_image: null,
          expiry_date: null
        },
        background_check: {
          status: 'pending',
          report_url: null,
          verified_on: null
        }
      },
      
      employment: {
        employee_id: `DB${Date.now()}${Math.floor(Math.random() * 1000)}`, // Auto-generated
        joining_date: Date.now(),
        employment_type: 'full_time', // Default
        salary_type: 'per_delivery', // Default
        salary_amount: 0,
        commission_per_delivery: 30, // Default
        status: true // Active by default
      },
      
      vehicle: {
        type: null,
        number: null,
        model: null,
        color: null,
        insurance_expiry: null,
        rc_image: null,
        is_verified: false
      },
      
      bank_details: {
        account_holder: null,
        account_number: null,
        ifsc_code: null,
        bank_name: null,
        branch: null,
        upi_id: null,
        verified: false
      },
      
      performance: {
        total_deliveries: 0,
        successful_deliveries: 0,
        failed_deliveries: 0,
        cancelled_deliveries: 0,
        avg_delivery_time: 0,
        avg_rating: 0,
        total_earnings: 0,
        total_payouts: 0,
        current_balance: 0
      },
      
      availability: {
        is_available: false,
        current_location: {
          type: 'Point',
          coordinates: [0, 0],
          last_updated: new Date()
        },
        online_since: null,
        offline_since: null,
        serviceable_zones: [],
        max_delivery_limit: 5,
        current_deliveries: []
      },
      
      schedule: [], // Empty array - vendor will set later
      documents: [], // Empty array - vendor will upload later
      ratings: [], // Empty array - will be populated after deliveries
      payouts: [], // Empty array - will be populated after earnings
      tags: [], // Empty array - vendor can add tags later
      notes: null
    };

    const deliveryBoy = new DeliveryBoy(deliveryBoyData);
    await deliveryBoy.save();


    console.log(`✅ Delivery boy profile created with ID: ${deliveryBoy._id}`);
    return deliveryBoy;
    
  } catch (error) {
    console.error('❌ Error creating delivery boy profile:', error);
    throw error;
  }
};

/**
 * CREATE - Create delivery boy profile (if not created during registration)
 */
const uploadDeliveryBoyProfile = async (req, res) => {
  try {
    const { user_id, vendor_id } = req.body;

    // Check if user exists and is delivery boy
    const user = await User.findOne({ 
      _id: user_id 
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or user is not a delivery boy'
      });
    }

    // Create delivery boy profile
    const uploadDeliveryBoyDocuments = new DeliveryBoy({
      user_id,
      vendor_id,
      personal_details: {
        full_name: req.body.full_name || user.username,
        email: user.email,
        mobile: user.mobile,
        alternate_mobile: req.body.alternate_mobile,
        profile_image: req.body.profile_image,
        date_of_birth: req.body.date_of_birth,
        gender: req.body.gender,
        address: req.body.address
      },
      verification: {
        aadhar_number: req.body.aadhar_number,
        pan_number: req.body.pan_number,
        driving_license: {
          license_number: req.body.driving_license_number,
          expiry_date: req.body.driving_license_expiry
        }
      },
      employment: {
        employment_type: req.body.employment_type || 'full_time',
        salary_type: req.body.salary_type || 'per_delivery',
        salary_amount: req.body.salary_amount || 0,
        commission_per_delivery: req.body.commission_per_delivery || 30,
        status: true
      },
      vehicle: {
        type: req.body.vehicle_type,
        number: req.body.vehicle_number,
        model: req.body.vehicle_model,
        color: req.body.vehicle_color
      },
      bank_details: req.body.bank_details || {},
      schedule: req.body.schedule || [],
      tags: req.body.tags || [],
      notes: req.body.notes
    });

    const deliveryBoy = await DeliveryBoy.findOneAndUpdate({user_id : user_id}, {uploadDeliveryBoyDocuments})
    await deliveryBoy.save();

    res.status(201).json({
      success: true,
      message: 'Delivery boy profile created successfully',
      data: deliveryBoy
    });

  } catch (error) {
    console.error('Create delivery boy error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Duplicate value for ${field}`,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create delivery boy profile',
      error: error.message
    });
  }
};

/**
 * READ - Get all delivery boys for a vendor
 */
const getVendorDeliveryBoys = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      search, 
      vehicle_type,
      is_available,
      min_rating 
    } = req.query;

    // Build query
    const query = { vendor_id: vendorId };
    
    // // Filter by employment status
    // if (status !== undefined) {
    //   query['employment.status'] = status === 'true';
    // }

    // // Filter by availability
    // if (is_available !== undefined) {
    //   query['availability.is_available'] = is_available === 'true';
    // }

    // // Filter by vehicle type
    // if (vehicle_type) {
    //   query['vehicle.type'] = vehicle_type;
    // }

    // // Filter by minimum rating
    // if (min_rating) {
    //   query['performance.avg_rating'] = { $gte: parseFloat(min_rating) };
    // }

    // Search by name, email, mobile, employee_id
    if (search) {
      query.$or = [
        { 'personal_details.full_name': { $regex: search, $options: 'i' } },
        { 'personal_details.email': { $regex: search, $options: 'i' } },
        { 'personal_details.mobile': { $regex: search } },
        { 'employment.employee_id': { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const deliveryBoys = await DeliveryBoy.find(query)
      .populate('user_id', 'username email mobile status')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    // Get total count
    const total = await DeliveryBoy.countDocuments(query);

    // Get statistics
    const stats = await DeliveryBoy.aggregate([
      { $match: { vendor_id: vendorId } },
      { $group: {
        _id: null,
        total_delivery_boys: { $sum: 1 },
        active_delivery_boys: { 
          $sum: { $cond: ['$employment.status', 1, 0] } 
        },
        available_delivery_boys: {
          $sum: { $cond: ['$availability.is_available', 1, 0] }
        },
        avg_rating_vendor: { $avg: '$performance.avg_rating' },
        total_deliveries: { $sum: '$performance.total_deliveries' },
        total_earnings: { $sum: '$performance.total_earnings' }
      }}
    ]);

    res.status(200).json({
      success: true,
      message: 'Delivery boys retrieved successfully',
      data: deliveryBoys,
      stats: stats[0] || {
        total_delivery_boys: 0,
        active_delivery_boys: 0,
        available_delivery_boys: 0,
        avg_rating_vendor: 0,
        total_deliveries: 0,
        total_earnings: 0
      },
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_items: total,
        items_per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get vendor delivery boys error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve delivery boys',
      error: error.message
    });
  }
};

/**
 * READ - Get single delivery boy by ID
 */
const getDeliveryBoyById = async (req, res) => {
  try {
    const { id } = req.params;

    const deliveryBoy = await DeliveryBoy.findById(id)
      .populate('user_id', 'username email mobile status')
      .populate('vendor_id', 'username email vendor_details.store_name')
      .populate('availability.serviceable_zones')
      .populate('availability.current_deliveries', 'order_id status');

      console.log("deliveryBoy", deliveryBoy)

    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: 'Delivery boy not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Delivery boy retrieved successfully',
      data: deliveryBoy
    });

  } catch (error) {
    console.error('Get delivery boy error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery boy ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve delivery boy',
      error: error.message
    });
  }
};

/**
 * READ - Get delivery boy by user ID
 */
const getDeliveryBoyByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const deliveryBoy = await DeliveryBoy.findOne({ user_id: userId })
      .populate('user_id', 'username email mobile status')
      .populate('vendor_id', 'username email vendor_details.store_name');

    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: 'Delivery boy profile not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Delivery boy retrieved successfully',
      data: deliveryBoy
    });

  } catch (error) {
    console.error('Get delivery boy by user ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve delivery boy',
      error: error.message
    });
  }
};

/**
 * UPDATE - Update delivery boy profile
 */
const updateDeliveryBoy = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove fields that shouldn't be directly updated
    delete updateData.user_id;
    delete updateData.vendor_id;
    delete updateData.performance;
    delete updateData.payouts;
    delete updateData.ratings;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Update timestamps for specific nested fields
    if (updateData.availability?.current_location) {
      updateData.availability.current_location.last_updated = new Date();
    }

    const deliveryBoy = await DeliveryBoy.findByIdAndUpdate(
      id,
      { $set: updateData },
      { 
        new: true, 
        runValidators: true 
      }
    ).populate('user_id', 'username email mobile');

    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: 'Delivery boy not found'
      });
    }

    // Update user email/mobile if changed
    if (updateData.personal_details?.email || updateData.personal_details?.mobile) {
      const userUpdate = {};
      if (updateData.personal_details.email) {
        userUpdate.email = updateData.personal_details.email;
      }
      if (updateData.personal_details.mobile) {
        userUpdate.mobile = updateData.personal_details.mobile;
      }
      
      await User.findByIdAndUpdate(
        deliveryBoy.user_id._id,
        { $set: userUpdate }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Delivery boy updated successfully',
      data: deliveryBoy
    });

  } catch (error) {
    console.error('Update delivery boy error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate value for unique field',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update delivery boy',
      error: error.message
    });
  }
};

/**
 * UPDATE - Update delivery boy status
 */
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const deliveryBoy = await DeliveryBoy.findByIdAndUpdate(
      id,
      { 
        $set: { 
          'employment.status': status,
          'availability.is_available': status // Also update availability
        } 
      },
      { new: true }
    );

    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: 'Delivery boy not found'
      });
    }

    // Update user status as well
    await User.findByIdAndUpdate(
      deliveryBoy.user_id,
      { $set: { status } }
    );

    res.status(200).json({
      success: true,
      message: `Delivery boy ${status ? 'activated' : 'deactivated'} successfully`,
      data: deliveryBoy
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
};

/**
 * UPDATE - Update delivery boy location
 */
const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const deliveryBoy = await DeliveryBoy.findByIdAndUpdate(
      id,
      {
        $set: {
          'availability.current_location': {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
            last_updated: new Date()
          }
        }
      },
      { new: true }
    );

    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: 'Delivery boy not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: {
        location: deliveryBoy.availability.current_location,
        last_updated: deliveryBoy.availability.current_location.last_updated
      }
    });

  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
};

/**
 * UPDATE - Update availability status
 */
const updateAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_available } = req.body;

    const updateData = {
      'availability.is_available': is_available
    };

    if (is_available) {
      updateData['availability.online_since'] = new Date();
    } else {
      updateData['availability.offline_since'] = new Date();
    }

    const deliveryBoy = await DeliveryBoy.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: 'Delivery boy not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Delivery boy is now ${is_available ? 'online' : 'offline'}`,
      data: {
        is_available: deliveryBoy.availability.is_available,
        online_since: deliveryBoy.availability.online_since,
        offline_since: deliveryBoy.availability.offline_since
      }
    });

  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update availability',
      error: error.message
    });
  }
};

/**
 * UPDATE - Verify delivery boy documents
 */
const verifyDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      verify_aadhar, 
      verify_pan, 
      verify_driving_license,
      background_check_status 
    } = req.body;

    const updateData = {};

    if (verify_aadhar !== undefined) {
      updateData['verification.aadhar_verified'] = verify_aadhar;
    }

    if (verify_pan !== undefined) {
      updateData['verification.pan_verified'] = verify_pan;
    }

    if (verify_driving_license !== undefined) {
      updateData['verification.driving_license.verified'] = verify_driving_license;
    }

    if (background_check_status) {
      updateData['verification.background_check.status'] = background_check_status;
      updateData['verification.background_check.verified_on'] = new Date();
    }

    const deliveryBoy = await DeliveryBoy.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Documents verified successfully',
      data: deliveryBoy.verification
    });

  } catch (error) {
    console.error('Verify documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify documents',
      error: error.message
    });
  }
};

/**
 * DELETE - Delete delivery boy
 */
const deleteDeliveryBoy = async (req, res) => {
  try {
    const { id } = req.params;

    const deliveryBoy = await DeliveryBoy.findById(id);

    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: 'Delivery boy not found'
      });
    }

    // Soft delete - update status instead of actual delete
    await DeliveryBoy.findByIdAndUpdate(id, {
      $set: {
        'employment.status': false,
        'availability.is_available': false
      }
    });

    // Update user status
    await User.findByIdAndUpdate(deliveryBoy.user_id, {
      $set: { status: false }
    });

    // Remove from vendor's delivery_boys array
    if (mongoose.modelNames().includes('Vendor')) {
      const Vendor = mongoose.model('Vendor');
      await Vendor.findOneAndUpdate(
        { user_id: deliveryBoy.vendor_id },
        {
          $pull: { 'delivery_team.delivery_boys': { delivery_boy_id: id } },
          $inc: { 
            'delivery_team.total_count': -1,
            'delivery_team.active_count': -1 
          }
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Delivery boy deactivated successfully',
      data: {
        id: deliveryBoy._id,
        user_id: deliveryBoy.user_id,
        status: 'deactivated'
      }
    });

  } catch (error) {
    console.error('Delete delivery boy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete delivery boy',
      error: error.message
    });
  }
};

/**
 * DELETE - Permanently delete delivery boy (Admin only)
 */
const permanentDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const deliveryBoy = await DeliveryBoy.findByIdAndDelete(id);

    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: 'Delivery boy not found'
      });
    }

    // Also delete the user account if needed
    if (req.query.delete_user === 'true') {
      await User.findByIdAndDelete(deliveryBoy.user_id);
    }

    res.status(200).json({
      success: true,
      message: 'Delivery boy permanently deleted',
      data: { id: deliveryBoy._id }
    });

  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete delivery boy',
      error: error.message
    });
  }
};

module.exports = {createDeliveryBoyProfile,
    uploadDeliveryBoyProfile,
    getVendorDeliveryBoys,
    getDeliveryBoyById,
    getDeliveryBoyByUserId,
   
    updateDeliveryBoy,
    updateStatus,
    updateLocation,
    updateAvailability,
    verifyDocuments,
    deleteDeliveryBoy,
    permanentDelete


}