const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { sendEmail, generateOTP } = require("../utils/sendmail");
const User = require("../models/User");
const { JWT_SECRET, JWT_EXPIRE, NODE_ENV } = require("../env-variables");
const { decodeToken, resetToken } = require("../utils/jwt");
const { sanitizeUser } = require("../utils/sanitizer");
const { setTokenCookie, clearTokenCookie } = require("../utils/cookieHelper");
const LoginAttempt = require('../models/LoginAttempt')
const cron = require("../utils/cronjob");

const checkBruteForce = async (loginIdentifier, ip) => {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  // Count failed attempts in the last 15 minutes
  const attempts = await LoginAttempt.countDocuments({
    login: loginIdentifier,
    ip_address: ip,
    time: { $gte: fifteenMinutesAgo },
  });

  if (attempts >= 5) {
    throw new Error(
      "Too many failed attempts. Please try again in 15 minutes."
    );
  }
};

const LoginUser = async (req, res) => {
  try {
    const { email, mobile, password } = req.body;

    const loginIdentifier = email || mobile;

    // 1. Find user by email or mobile
    const query = email ? { email } : { mobile };
    if (!email && !mobile) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide email or mobile" });
    }

    const user = await User.findOne(query)
      .select("+password")
      .populate("role", "-createdAt -updatedAt -__v"); // Ensure password is included

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials details" });
    }
    if(user.status !== true){
       return res
        .status(401)
        .json({ success: false, message: "Account is not active" });
    }

    // 2. Check Password (Assuming you use bcrypt.compare in your User model methods)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });
    }

    // 3. Generate Token
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );
    console.log("Generated JWT Token:", token);

    user.last_login = new Date();
    await user.save({ validateBeforeSave: false });

    setTokenCookie(res, token);

    res.status(200).json({
      success: true,
      message: "Login successfull",
      user: sanitizeUser(user),
      token 
    });
  }catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const ForgotPassword = async (req, res) => {
  const email = req.body.email;
  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "No user found with that email" });
    }

    const otpPin = generateOTP();
    console.log("Generated OTP:", otpPin);

    if (!user.security) {
      user.security = {};
    }

    user.security.forgotten_password_code = otpPin.toString();
    user.security.forgotten_password_time = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    const message = `You requested a password reset. Please copy the otp below:\n\n ${otpPin} \n\n If you did not request this, please ignore this email.`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset Request",
        message,
      });

      res
        .status(200)
        .json({ success: true, message: "Email sent successfully" });
    } catch (err) {
      console.log(err);
      return res
        .status(500)
        .json({ success: false, message: "Email could not be sent" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const VerifyOTP = async (req, res) => {
  try {
    const { email, otpPin } = req.body;
    console.log(req.body);
    const user = await User.findOne({ email }).select(
      "+security.forgotten_password_code"
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "No user found with that email" });
    }

    // Ensure otpPin was sent in the request body
    if (!otpPin) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide the OTP" });
    }

    const isMatch = await user.compareResetCode(otpPin);
    console.log("Stored OTP Hash:", user.security.forgotten_password_code);
    console.log("Entered OTP:", otpPin);
    console.log("OTP Match Status:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const resettoken = await resetToken(user._id, user.email, "reset");

    user.security.forgotten_password_code = undefined;
    user.security.forgotten_password_time = undefined;
    await user.save({ validateBeforeSave: false });

    res
      .status(200)
      .json({
        success: true,
        message: "OTP verified successfully",
        resettoken,
      });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken) {
      return res
        .status(400)
        .json({ success: false, message: "Reset token is required" });
    }

    const decoded = await decodeToken(resetToken);
    if (!decoded) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset token" });
    }

    const user = await User.findById(decoded.id).select("+password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const LogoutUser = async (req, res) => {
  console.log(req.body)
  try {
    clearTokenCookie(res);

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  sendEmail,
  LoginUser,
  ForgotPassword,
  VerifyOTP,
  resetPassword,
  LogoutUser,
};
