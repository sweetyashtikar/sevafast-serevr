const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {sendEmail,generateOTP} = require('../utils/sendmail');
const User = require('../models/User');
const { JWT_SECRET, JWT_EXPIRE } = require('../env-variables');

const LoginUser = async (req, res) => {
    try {
        const { email, mobile, password } = req.body;

        // 1. Find user by email or mobile
        const query = email ? { email } : { mobile };
        if (!email && !mobile) {
            return res.status(400).json({ success: false, message: "Please provide email or mobile" });
        }

        const user = await User.findOne(query).select('+password').populate('role','-createdAt -updatedAt -__v'); // Ensure password is included

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials details" });
        }

        // 2. Check Password (Assuming you use bcrypt.compare in your User model methods)
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid password" });
        }

        // 3. Generate Token
        const token = jwt.sign({ id: user._id }, JWT_SECRET, {
            expiresIn: JWT_EXPIRE,
        });

        res.status(200).json({
            success: true,
            token,
            user 
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
};


const ForgotPassword = async (req, res) => {
    const email = req.body.email;
    try {
        const user = await User.findOne({ email: email });

        if (!user) {
            return res.status(404).json({ success: false, message: "No user found with that email" });
        }

        const otpPin = generateOTP();
        console.log("Generated OTP:", otpPin);
        const hashedotp = await bcrypt.hash(otpPin.toString(),10);

        user.otpPin = hashedotp;
        user.otpExpire = Date.now() + 10 * 60 * 1000;
        
        await user.save({ validateBeforeSave: false });

        const message = `You requested a password reset. Please copy the otp below:\n\n ${otpPin} \n\n If you did not request this, please ignore this email.`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password Reset Request',
                message,
            });

            res.status(200).json({ success: true, message: 'Email sent successfully' });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ success: false, message: 'Email could not be sent' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
}; 

const VerifyOTP = async (req, res) => {
    try {
        const { email, otpPin } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "No user found with that email" });
        }
        if (user.otpExpire < Date.now()) {
            return res.status(400).json({ success: false, message: "OTP has expired" });
        }

        // Ensure otpPin was sent in the request body
        if (!otpPin) {
            return res.status(400).json({ success: false, message: "Please provide the OTP" });
        }

        const isMatch = await bcrypt.compare(otpPin.toString(), user.otpPin);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        user.otpPin = undefined;
        user.otpExpire = undefined;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({ success: true, message: "OTP verified successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "No user found with that email" });
        }   

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        user.password = newPasswordHash;
        await user.save();

        res.status(200).json({ success: true, message: "Password reset successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {sendEmail, LoginUser, ForgotPassword, VerifyOTP, resetPassword};