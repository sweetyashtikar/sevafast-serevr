// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../env-variables');

const protect = async (req, res, next) => {
    let token;

    // Check for token in cookies first
    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }
    // Fallback to Authorization header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Not authorized to access this route' 
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get user from database
        req.user = await User.findById(decoded.id);
        
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        next();
    } catch (error) {
        console.log(error);
        return res.status(401).json({ 
            success: false, 
            message: 'Not authorized to access this route' 
        });
    }
};

module.exports = { protect };