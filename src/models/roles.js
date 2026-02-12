const mongoose = require('mongoose')
const express = require('express')

const roleSchema = new mongoose.Schema({
    role: {
        type: String,
        required: true,
        trim: true
    },
    // can_manage_products:{
    //     type: Boolean,
    //     default: false
    // },
    // can_manage_overall:{
    //     type: Boolean,
    //     default: false
    // }
}, { 
    timestamps: true 
});

const Role = mongoose.model('Role', roleSchema);
module.exports = Role;