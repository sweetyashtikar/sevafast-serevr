const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/roles');
const PermissionChecker = require('../utils/permissionChecker')


const authenticate = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ success: false, message: "Access denied. No token provided." });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // POPULATE role here so that checkIfAdmin has access to the role name
        const user = await User.findById(decoded.id)
            .select('-password')
            .populate('role');

        // 1. CHECK IF USER EXISTS FIRST
        if (!user) {
            return res.status(404).json({ success: false, message: "User no longer exists." });
        }

        // 2. THEN CHECK IF ACTIVE
        if (!user.status) {
            return res.status(403).json({ success: false, message: "Your account is inactive." });
        }

        const userPermission = await PermissionChecker.getUserPermissions(user._id)

        //attach user and permission to the request
        req.user = {
            ...user.toObject(),
            permissions: userPermission.permissions
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Invalid Token"
            })
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Authentication failed',
            error: error.message
        });
    }
};

/**
 * 2. Optional Auth: Flexible check
 * Used for public routes where you still want to know if a user is logged in 
 * (e.g., to check if they liked a product), but don't want to block guests.
 */
const optionalAuth = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');
            if (user) {
                req.user = user;
            }
        }
        // Always call next(), even if token is missing or invalid
        next();
    } catch (error) {
        // We don't block the request here, just proceed as a guest
        next();
    }
};

/**
 * 3. Authorize Permission: Dynamic Role Check
 * Checks if the user's role has the specific permission in the database.
 */
const authorizePermission = (permissionField) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Authentication required." });
            }
            // Look up the role settings in your Role collection
            const roleData = await Role.findOne({ _id: req.user.role });

            if (!roleData) {
                return res.status(403).json({ message: "Role permissions not configured." });
            }

            // Check the specific boolean field (e.g., can_manage_products)
            if (roleData[permissionField] === true) {
                return next();
            }

            return res.status(403).json({ message: "You do not have permission to perform this action." });
        } catch (error) {
            res.status(500).json({ message: "Authorization error", error: error.message });
        }
    };
}

const checkIfAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required." });
        }
        const role = req.user.role?.role
        if (role === 'admin') {
            return next();
        }

        return res.status(403).json({ message: "You do not have permission to perform this action." });
    } catch (error) {
        console.log("hey error", error)
        res.status(500).json({ message: "Authorization error", error: error.message });
    }
};

/**
 * Authorization middleware (simplified)
 * Now uses PermissionChecker utility
 */

const authorize = (resource, action) => {
    return PermissionChecker.requirePermission(resource.action);
}

/**
 * Authorization middleware for any of multiple permissions
 */
const authorizeAny = (requiredPermission) => {
    return PermissionChecker.requireAnyPermission(requiredPermissions);
}
/**
 * Authorization middleware for all of multiple permissions
 */
const authorizeAll = (requiredPermissions) => {
    return PermissionChecker.requireAllPermissions(requiredPermissions);
};

const authorizeRole = (...allowedRoles) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userRole = req.user.role?.name;

        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient role privileges'
            });
        }

        next();
    };
};




module.exports = {
    authenticate, optionalAuth, authorizePermission, checkIfAdmin,
    authorize,           // For single permission check
    authorizeAny,        // For any of multiple permissions
    authorizeAll,        // For all of multiple permissions
    authorizeRole
};