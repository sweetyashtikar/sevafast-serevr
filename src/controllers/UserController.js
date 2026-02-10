const express = require('express');
const User = require('../models/User');
const Roles = require('../models/roles');
const bcrypt = require('bcryptjs');

// Create a new user
const RegisterUser = async (req, res) => {    
    console.log("req.body", req.body)
    try {
        const {  username, email, mobile, password, role, 
            latitude, longitude, address, city, pincode,
            company, fcm_id , zipcodes } = req.body;
           const ip_address = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || req.ip;
           console

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

        const findRole = await Roles.findOne({ role });
        if (!findRole) return res.status(400).json({ success: false ,message: 'Invalid role' });

        const userData = {
            username: username || email.split('@')[0], // Fallback if username not provided
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
        };
        if (findRole.role === "customer") {
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
    const userId = req.user.id;
    
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
    getMyProfile
};