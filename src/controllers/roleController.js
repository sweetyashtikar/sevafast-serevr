const express = require('express');
const Roles = require('../models/roles');
// Create a new role
const createRole = async (req, res) => {    
    try {
        const { role,can_manage_products } = req.body;

        if (!role) return res.status(400).json({success:false, message: 'Role name is required' });
        
        const findRole = await Roles.findOne({ role });
        if (findRole)  return  res.status(400).json({ success:false, message: 'Role already exists' });
        
        const newRole = new Roles({ role, can_manage_products });
        await newRole.save();
        res.status(201).json({
            success: true, 
            message: 'Role created successfully', 
            data :newRole
        });
    } catch (error) {
        res.status(500).json({ success:false, message: error.message });
    }       
};

//get all roles
const getAllRoles = async (req, res) => {
    try {
        const roles = await Roles.find({role : {$ne :'admin'}});
        res.status(200).json({success : true , data :roles});
    } catch (error) {
        res.status(500).json({ success:false, message: error.message });
    }
}

//update the role
const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const updatedRole = await Roles.findByIdAndUpdate(id, { role }, { new: true });
        if (!updatedRole)  return res.status(404).json({ message: 'Role not found' });   
        res.status(200).json({
            success: true,
            message: 'Role updated successfully',
            data :updatedRole
        });
    } catch (error) {
        res.status(500).json({ success:false, message: error.message });
    }
}

//delete role
const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;  
        const deletedRole = await Roles.findByIdAndDelete(id);
        if (!deletedRole) return res.status(404).json({ message: 'Role not found' });
        
        res.status(200).json({ 
            success: true,
            message: 'Role deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ success:false, message: error.message });
    }
}
module.exports = { createRole ,getAllRoles, updateRole, deleteRole };