const express = require('express');
const User = require('../models/User');
const Roles = require('../models/roles');
const bcrypt = require('bcryptjs');
const Wallet = require('../models/wallet');
const WalletTransaction = require('../models/walletTransaction');
const {createDeliveryBoyProfile} = require('../controllers/deliveryBoy')

// Create a new user
const RegisterUser = async (req, res) => {    
    console.log("req.body", req.body)
    try {
        const {  username, email, mobile, password, role, 
            latitude, longitude, address, city, pincode,
            company, fcm_id , zipcodes, vendor_id, field_manager } = req.body;
           const ip_address = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || req.ip;
           
        // 2. Check that at least ONE contact method exists
        if (!email && !mobile) {
            return res.status(400).json({ success: false, message: 'Email or Mobile must be provided' });
        }

        const query = [];
        if (email) query.push({ email });
        if (mobile) query.push({ mobile });
        
        const findEmailOrMobile = await User.findOne({ $or: query });
        if (findEmailOrMobile) {
            const conflictField = findEmailOrMobile.email === email ? 'email' : 'mobile';
            return res.status(400).json({ success: false, message: `User with this ${conflictField} already exists` });
        }

        if(role === 'delivery_boy' && !vendor_id){
             return res.status(400).json({
        success: false,
        message: 'Vendor ID is required for creating a delivery boy'
      });
        }

         // Check if vendor exists (only if role is delivery_boy)
    if (role === 'delivery_boy') {
      const vendor = await User.findOne({ 
        _id: vendor_id, 
      });
      
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }
    }

        const findRole = await Roles.findOne({ role });
        if (!findRole) return res.status(400).json({ success: false ,message: 'Invalid role' });

        const userData = {
            username: username , // Fallback if username not provided
            email,
            mobile,
            password,
            role: findRole._id,
            company,
            fcm_id,
            ip_address: ip_address,
            // Mapping Nested Address Object
            address_info: {
                address,
                city,
                pincode
            },
            zipcodes : zipcodes || [],
            friends_code: null,
            field_manager: field_manager || null
        };

        // 4. Validate Referral Code (friends_code) if role is vendor
        if (findRole.role === "vendor" && req.body.friends_code) {
            console.log(`[Signup] Validating referral code: ${req.body.friends_code} for user: ${email || mobile}`);
            
            // Find vendor role ID to ensure strictly vendor-to-vendor referral
            const vendorRole = await Roles.findOne({ role: 'vendor' });
            
            if (vendorRole) {
                const referrer = await User.findOne({ 
                    referral_code: req.body.friends_code,
                    role: vendorRole._id // Strict check: Referrer must be a vendor
                });
                
                if (referrer) {
                    console.log(`[Signup] Valid referral code from vendor: ${referrer.username}`);
                    userData.friends_code = req.body.friends_code;
                } else {
                    console.warn(`[Signup] REJECTED: referral_code '${req.body.friends_code}' not found or not a vendor.`);
                }
            }
        }

        if (findRole.role === "customer" || findRole.role === "delivery_boy") {
            userData.status = true;
        }

        // 5. Handle Geo-Location (GeoJSON format)
        if (latitude && longitude) {
            userData.location = {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)] // [long, lat]
            };
        }

        const newUser = new User(userData);
        await newUser.save();

        let delivery_boy_profile = null;
         // If role is delivery_boy, create delivery boy profile
    if (role === 'delivery_boy') {
      delivery_boy_profile = await createDeliveryBoyProfile(newUser._id, vendor_id);
    }

    // Create wallet for Vendors and Field Managers
    if (findRole.role === 'vendor' || findRole.role === 'field_manager') {
        await Wallet.getOrCreate(newUser._id);
    }

        res.status(201).json({
            success: true, 
            message: 'User created successfully', 
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({success: false, message: error.message });
    }   
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().populate('role');   
        const nonAdminUsers = users.filter(user => 
            user.role && user.role !== 'admin'
    );
        res.status(200).json({success : true , data :nonAdminUsers});
    } catch (error) {
        res.status(500).json({ success: false ,message: error.message });
    }
}

const getAllUsersWithFilters = async (req, res) => {
    console.log(req.body)
    const { role } = req.body;
    
    try {
        let query = {};
        
        // If role is provided, search for it in Role collection
        if (role) {
            // Find the role in Role collection by name (case insensitive)
            const roleDoc = await Roles.findOne({ 
                role: { $regex: new RegExp(`^${role}$`, 'i') } 
            });
            
            if (!roleDoc) {
                return res.status(404).json({ 
                    success: false, 
                    message: `Role '${role}' not found` 
                });
            }
            
            // Add role ID to query
            query.role = roleDoc._id;
        }
        
        // Find users with the query (either all users or filtered by role)
        const users = await User.find(query).populate('role');
        
        // Apply the non-admin filter
        const nonAdminUsers = users.filter(user => 
            user.role && user.role.name !== 'admin'
        );
        
        res.status(200).json({ 
            success: true, 
            count: nonAdminUsers.length,
            data: nonAdminUsers 
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
}

const getAllVendors = async (req, res) => {
    const vendorRole = await Roles.findOne({ role: 'vendor' });
    if (!vendorRole) {
        return res.status(404).json({ success: false, message: 'Vendor role not found' });
    }
    try {
        const users = await User.find({ role: vendorRole._id }).populate('role');   
        res.status(200).json({success : true , data :users});
    } catch (error) {
        res.status(500).json({ success: false ,message: error.message });
    }
}

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, mobile, password, role, status } = req.body;
        const updatedUser = await User.findByIdAndUpdate(id, { email, mobile, password, role, status }, { new: true });
        if (!updatedUser) return res.status(404).json({success: false, message: 'User not found' });   
        res.status(200).json({  
            success: true,
            message: 'User updated successfully',
            data :updatedUser
        });
    } catch (error) {
        res.status(500).json({success: false,  message: error.message });
    }
}

const Updatestatus = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("id", id)
        const {newStatus} = req.body;
        console.log("newStatus", newStatus)
        const updatedUser = await User.findByIdAndUpdate(id, {status :newStatus}, { new: true });
        if (!updatedUser) return res.status(404).json({success: false, message: 'User not found' });   
        res.status(200).json({  
            success: true,
            message: 'User status updated successfully',
            data :updatedUser
        });
    } catch (error) {
        res.status(500).json({success: false,  message: error.message });
    }
}

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;  
        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) return res.status(404).json({ message: 'User not found' });
        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    }catch (error) {
        res.status(500).json({success: false, message: error.message });
    }
};

const getMyProfile = async (req, res) => {
  try {
    // Get user ID from authentication middleware (assuming you have auth middleware)
    const userId = req.user._id;
    
    // Find user by ID, populate role, exclude sensitive fields
    const user = await User.findById(userId)
      .select('-password -apikey -security') // Exclude sensitive data
      .populate('role', 'role'); // Populate role details
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile',
      error: error.message
    });
  }
};

module.exports = {
    RegisterUser,
    getAllUsers,
    updateUser,
    deleteUser,
    getAllVendors,
    getMyProfile,
    getAllUsersWithFilters,
    Updatestatus
};