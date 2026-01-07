const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {sendEmail,generateOTP} = require('../utils/sendmail');
const User = require('../models/User');

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
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE,
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
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            return res.status(404).json({ success: false, message: "No user found with that email" });
        }

        // 1. Generate Reset Token (Random string)
        const resetToken = crypto.randomBytes(20).toString('hex');

        // 2. Hash and set to user model (Store in DB for 10 mins)
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save({ validateBeforeSave: false });

        const message = `You requested a password reset. Please copy the otp below:\n\n ${generateOTP()} \n\n If you did not request this, please ignore this email.`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password Reset Request',
                message,
            });

            res.status(200).json({ success: true, message: 'Email sent successfully' });
        } catch (err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });
            console.log(err);
            return res.status(500).json({ success: false, message: 'Email could not be sent' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
}; 

// const VerifyOTP = async (req, res) => {
//     try {
//         const { email, otpPin } = req.body;
//         const user = await User.findOne({ email });

//         if (!user) {
//             return res.status(404).json({ success: false, message: "No user found with that email" });
//         }
//         if (user.otpPin !== otpPin) {


module.exports = {sendEmail, LoginUser, ForgotPassword};