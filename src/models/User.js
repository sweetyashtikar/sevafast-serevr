const mongoose = require("mongoose");
const express = require("express");
const bcrypt = require("bcryptjs");

// 1. Define the Schema (Fields + Options)
const userSchema = new mongoose.Schema(
  {
    // --- Identity & Authentication ---
    username: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    mobile: { type: String, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    ip_address: { type: String },
    image: { type: String }, // URL to the image
    status: { type: Boolean, default: false },
    fcm_id: { type: String }, // Firebase Cloud Messaging ID for notifications
    apikey: { type: String, select: false },

    // --- Financials ---
    balance: { type: Number, default: 0 },
    cash_received: { type: Number, default: 0.0 },
    bonus_type: {
      type: String,
      enum: ["percentage_per_order", "flat_amount"], // Added enum for safety
      default: "percentage_per_order",
    },
    bonus: { type: Number },

    // --- Security & Reset Tokens (Grouped) ---
    security: {
      activation_selector: { type: String },
      activation_code: { type: String },
      forgotten_password_selector: { type: String },
      forgotten_password_code: { type: String }, // otp hashed
      forgotten_password_time: { type: Date },
      remember_selector: { type: String },
      remember_code: { type: String },
    },

    // --- Profile Information ---
    company: { type: String },
    dob: { type: String },
    country_code: { type: Number },
    referral_code: { type: String },
    friends_code: { type: String },
    referral_reward_issued: { type: Boolean, default: false },

    // --- Location & Address (Grouped) ---
    address_info: {
      address: String,
      street: String,
      area: String,
      city: String,
      pincode: String,
    },
    zipcodes: [String], // Converted to array for easier searching

    // --- Geo-Location (Standardized) ---
    location: {
      type: { type: String, default: "Point" },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },

field_manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // --- Timestamps & Tracking ---
    last_login: { type: Date },
    created_on: { type: Date, default: Date.now },
  },
  {
    timestamps: true, // Automatically handles created_at and updated_at
  }
);


// PRE-SAVE HOOK: Hash password and generate referral code
userSchema.pre("save", async function () {
  // 1. Handle Password Hashing
  if (this.isModified("password")) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      console.log(error);
      throw error; // Throw instead of next(error) for async
    }
  }

  // 2. Generate Referral Code for Vendors
  if (this.isNew && !this.referral_code) {
    try {
      const Role = mongoose.model("Role");
      const vendorRole = await Role.findOne({ role: 'vendor' });
      
      if (vendorRole && this.role && this.role.toString() === vendorRole._id.toString()) {
        const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
        const usernamePart = this.username ? this.username.replace(/\s+/g, '').substring(0, 5).toUpperCase() : 'USER';
        this.referral_code = `VF-${usernamePart}-${randomStr}`;
      }
    } catch (error) {
      console.error("Error generating referral code:", error);
    }
  }
});

// Pre-save hook specifically for security updates
userSchema.pre("save", async function () {
  // Handle OTP Hashing
  if (this.isModified("security.forgotten_password_code")) {
    try {
      if (
        this.security && 
        this.security.forgotten_password_code && 
        typeof this.security.forgotten_password_code === 'string'
      ) {
        const isAlreadyHashed = /^\$2[aby]\$/.test(this.security.forgotten_password_code);
        if (!isAlreadyHashed) {
          const salt = await bcrypt.genSalt(10);
          this.security.forgotten_password_code = await bcrypt.hash(
            this.security.forgotten_password_code,
            salt
          );
        }
      }
    } catch (error) {
      console.log("OTP hashing error:", error);
      throw error;
    }
  }
});

// METHOD: Compare password for Login
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// METHOD: Compare OTP for Verification
userSchema.methods.compareResetCode = async function (enteredCode) {
  // Check if security exists, forgotten_password_code exists, and it's not undefined
  if (
    !this.security || 
    !this.security.forgotten_password_code ||
    typeof this.security.forgotten_password_code !== 'string'
  ) {
    return false;
  }
  
  try {
    return await bcrypt.compare(enteredCode, this.security.forgotten_password_code);
  } catch (error) {
    console.error("Error comparing reset code:", error);
    return false;
  }
};

// 2. Create the Model
const User = mongoose.model("User", userSchema);

module.exports = User;
