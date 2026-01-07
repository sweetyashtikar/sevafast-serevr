const express = require('express');
const User = require('../models/User');
const Roles = require('../models/roles');
const bcrypt = require('bcryptjs');

// Create a new user
const RegisterUser = async (req, res) => {    
    try {
        const {  email, mobile, password , role } = req.body;

        // 2. Check that at least ONE contact method exists
        if (!email && !mobile) {
            return res.status(400).json({ success: false, message: 'Email or Mobile must be provided' });
        }

        const query = [];
        if (email) query.push({ email });
        if (mobile) query.push({ mobile });
        
        const findEmailOrMobile = await User.findOne({ $or: query });
        if (findEmailOrMobile) return res.status(400).json({ success: false, message: `User with this mobile or email already exists` });

        const findRole = await Roles.findOne({ role });
        if (!findRole) return res.status(400).json({ success: false ,message: 'Invalid role' });

        const newUser = new User({email, mobile, password, role: findRole._id });
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

module.exports = {
    RegisterUser,
    getAllUsers,
    updateUser,
    deleteUser
};