const mongoose = require('mongoose')
const express = require('express')
const bcrypt = require('bcryptjs');

// 1. Define the Schema (Fields + Options)
const userSchema = new mongoose.Schema({
    email: {
        type: String
    },
    mobile: {   
        type: String
    },
    password: {
        type: String,
        select: false
    },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role' 
    },   
    status : {
        type: String,
        enum : ["Active", "Inactive"],
        default : "Active"
    },
    otpPin: {
        type: String
    }
}, { 
    timestamps: true 
});


// PRE-SAVE HOOK: Hash password before saving to DB
userSchema.pre('save', async function (next) {
    // Only hash if the password is new or being modified
    if (!this.isModified('password')) return;

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        console
        next(err);
    }
});

// METHOD: Compare password for Login
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// 2. Create the Model
const User = mongoose.model('User', userSchema);

module.exports = User;