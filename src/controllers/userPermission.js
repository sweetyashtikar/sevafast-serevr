const UserPermission = require('../models/userPermission');
const User = require('../models/User'); // Assuming you have User model
const Role = require('../models/roles'); // Assuming you have Role model

const permission = {
    ON: 'on',
    OFF: 'off'
};

/**
 * Create new user permission
 */
exports.createUserPermission = async (req, res) => {
    try {
        const { user_id, role, permissions } = req.body;

        // Validate required fields
        if (!user_id || !role) {
            return res.status(400).json({
                success: false,
                message: 'User ID and Role are required'
            });
        }

        // Check if user exists
        const userExists = await User.findById(user_id);
        if (!userExists) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if role exists
        const roleExists = await Role.findById(role);
        if (!roleExists) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        // Check if permission already exists for this user
        const existingPermission = await UserPermission.findOne({ user_id });
        if (existingPermission) {
            return res.status(409).json({
                success: false,
                message: 'Permission already exists for this user'
            });
        }

        // Validate permissions structure
        if (permissions && typeof permissions === 'object') {
            for (const [key, value] of Object.entries(permissions)) {
                if (value && typeof value === 'object') {
                    for (const action of ['create', 'read', 'update', 'delete']) {
                        if (value[action] && ![true, false].includes(value[action])) {
                            return res.status(400).json({
                                success: false,
                                message: `Invalid permission value for ${key}.${action}. Must be 'on' or 'off'`
                            });
                        }
                    }
                }
            }
        }

        // Create new user permission
        const userPermission = new UserPermission({
            user_id,
            role,
            permissions: permissions || {}
        });

        await userPermission.save();

        // Populate user and role details
        const populatedPermission = await UserPermission.findById(userPermission._id)
            .populate('user_id', 'username email role')
            .populate('role', 'role');

        res.status(201).json({
            success: true,
            message: 'User permission created successfully',
            data: populatedPermission
        });

    } catch (error) {
        console.error('Create user permission error:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Permission already exists for this user'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error creating user permission',
            error: error.message
        });
    }
};

/**
 * Get all user permissions with pagination
 */
exports.getAllUserPermissions = async (req, res) => {
    try {
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Search/filter
        const searchQuery = {};
        
        if (req.query.role) {
            searchQuery.role = req.query.role;
        }
        
        if (req.query.user_id) {
            searchQuery.user_id = req.query.user_id;
        }

        // Get total count for pagination info
        const total = await UserPermission.countDocuments(searchQuery);

        // Get user permissions with pagination
        const userPermissions = await UserPermission.find(searchQuery)
            .populate('user_id', 'username email mobile role')
            .populate('role', 'name description')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Calculate pagination info
        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.status(200).json({
            success: true,
            message: 'User permissions retrieved successfully',
            data: userPermissions,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage,
                hasPrevPage
            }
        });

    } catch (error) {
        console.error('Get all user permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving user permissions',
            error: error.message
        });
    }
};

/**
 * Get user permission by ID
 */
exports.getUserPermissionById = async (req, res) => {
    try {
        const { id } = req.params;

        const userPermission = await UserPermission.findById(id)
            .populate('user_id', 'username email mobile role image')
            .populate('role', 'name description permissions');

        if (!userPermission) {
            return res.status(404).json({
                success: false,
                message: 'User permission not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User permission retrieved successfully',
            data: userPermission
        });

    } catch (error) {
        console.error('Get user permission by ID error:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user permission ID'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error retrieving user permission',
            error: error.message
        });
    }
};

/**
 * Get user permission by user ID
 */
exports.getUserPermissionByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        console.log("userID", userId)

        const userPermission = await UserPermission.findOne({ user_id: userId })
            .populate('user_id', 'username email mobile role')
            .populate('role', 'name description');

            console.log(userPermission)

        if (!userPermission) {
            return res.status(404).json({
                success: false,
                message: 'User permission not found for this user'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User permission retrieved successfully',
            data: userPermission
        });

    } catch (error) {
        console.error('Get user permission by user ID error:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error retrieving user permission',
            error: error.message
        });
    }
};

/**
 * Update user permission
 */
exports.updateUserPermission = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, permissions } = req.body;

        // Find existing permission
        const existingPermission = await UserPermission.findById(id);
        if (!existingPermission) {
            return res.status(404).json({
                success: false,
                message: 'User permission not found'
            });
        }

        // Prepare update data
        const updateData = {};

        if (role) {
            // Check if role exists
            const roleExists = await Role.findById(role);
            if (!roleExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Role not found'
                });
            }
            updateData.role = role;
        }

        if (permissions && typeof permissions === 'object') {
            // Validate permissions structure
            for (const [key, value] of Object.entries(permissions)) {
                if (value && typeof value === 'object') {
                    for (const action of ['create', 'read', 'update', 'delete']) {
                        if (value[action] && ![true,false].includes(value[action])) {
                            return res.status(400).json({
                                success: false,
                                message: `Invalid permission value for ${key}.${action}. Must be 'on' or 'off'`
                            });
                        }
                    }
                }
            }
            
            // Merge existing permissions with new ones
            const currentPermissions = existingPermission.permissions || new Map();
            const newPermissions = new Map(currentPermissions);
            
            // Update with new permission values
            Object.entries(permissions).forEach(([key, value]) => {
                if (value && typeof value === 'object') {
                    newPermissions.set(key, {
                        ...(currentPermissions.get(key) || {}),
                        ...value
                    });
                }
            });
            
            updateData.permissions = newPermissions;
        }

        // Update user permission
        const updatedPermission = await UserPermission.findByIdAndUpdate(
            id,
            { $set: updateData },
            { 
                new: true,
                runValidators: true
            }
        ).populate('user_id', 'username email role')
         .populate('role', 'name description');

        res.status(200).json({
            success: true,
            message: 'User permission updated successfully',
            data: updatedPermission
        });

    } catch (error) {
        console.error('Update user permission error:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user permission ID'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error updating user permission',
            error: error.message
        });
    }
};

/**
 * Update specific permissions for a user
 */
exports.updateSpecificPermissions = async (req, res) => {
    try {
        const { userId } = req.params;
        const { permissions } = req.body;

        if (!permissions || typeof permissions !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Permissions object is required'
            });
        }

        // Find existing permission
        const existingPermission = await UserPermission.findOne({ user_id: userId });
        if (!existingPermission) {
            return res.status(404).json({
                success: false,
                message: 'User permission not found'
            });
        }

        // Validate and prepare permission updates
        const currentPermissions = existingPermission.permissions || new Map();
        const updatedPermissions = new Map(currentPermissions);

        for (const [resource, actions] of Object.entries(permissions)) {
            if (actions && typeof actions === 'object') {
                const currentResourcePermissions = currentPermissions.get(resource) || {};
                const updatedResourcePermissions = { ...currentResourcePermissions };

                for (const [action, value] of Object.entries(actions)) {
                    if (['create', 'read', 'update', 'delete'].includes(action)) {
                        if (![true, false].includes(value)) {
                            return res.status(400).json({
                                success: false,
                                message: `Invalid permission value for ${resource}.${action}. Must be 'on' or 'off'`
                            });
                        }
                        updatedResourcePermissions[action] = value;
                    }
                }

                updatedPermissions.set(resource, updatedResourcePermissions);
            }
        }

        // Update permissions
        const updatedPermission = await UserPermission.findOneAndUpdate(
            { user_id: userId },
            { $set: { permissions: updatedPermissions } },
            { 
                new: true,
                runValidators: true
            }
        ).populate('user_id', 'username email role')
         .populate('role', 'name description');

        res.status(200).json({
            success: true,
            message: 'Permissions updated successfully',
            data: updatedPermission
        });

    } catch (error) {
        console.error('Update specific permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating permissions',
            error: error.message
        });
    }
};

/**
 * Delete user permission
 */
exports.deleteUserPermission = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedPermission = await UserPermission.findByIdAndDelete(id);

        if (!deletedPermission) {
            return res.status(404).json({
                success: false,
                message: 'User permission not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User permission deleted successfully',
            data: {
                id: deletedPermission._id,
                user_id: deletedPermission.user_id
            }
        });

    } catch (error) {
        console.error('Delete user permission error:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user permission ID'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error deleting user permission',
            error: error.message
        });
    }
};

/**
 * Delete user permission by user ID
 */
exports.deleteUserPermissionByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        const deletedPermission = await UserPermission.findOneAndDelete({ user_id: userId });

        if (!deletedPermission) {
            return res.status(404).json({
                success: false,
                message: 'User permission not found for this user'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User permission deleted successfully',
            data: {
                id: deletedPermission._id,
                user_id: deletedPermission.user_id
            }
        });

    } catch (error) {
        console.error('Delete user permission by user ID error:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error deleting user permission',
            error: error.message
        });
    }
};

/**
 * Check user permission for a specific resource and action
 */
exports.checkUserPermission = async (req, res) => {
    try {
        const { userId } = req.params;
        const { resource, action } = req.query;

        if (!resource || !action) {
            return res.status(400).json({
                success: false,
                message: 'Resource and action query parameters are required'
            });
        }

        const userPermission = await UserPermission.findOne({ user_id: userId });

        if (!userPermission) {
            return res.status(404).json({
                success: false,
                hasPermission: false,
                message: 'User permission not found'
            });
        }

        const permissions = userPermission.permissions || new Map();
        const resourcePermissions = permissions.get(resource);
        
        const hasPermission = resourcePermissions && 
                             resourcePermissions[action] === true;

        res.status(200).json({
            success: true,
            hasPermission,
            message: hasPermission 
                ? `User has ${action} permission for ${resource}` 
                : `User does not have ${action} permission for ${resource}`,
            data: {
                userId,
                resource,
                action,
                permissionValue: resourcePermissions ? resourcePermissions[action] : 'off'
            }
        });

    } catch (error) {
        console.error('Check user permission error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error checking permission',
            error: error.message
        });
    }
};

/**
 * Get all users with specific permission for a resource and action
 */
exports.getUsersWithPermission = async (req, res) => {
    try {
        const { resource, action } = req.query;

        if (!resource || !action) {
            return res.status(400).json({
                success: false,
                message: 'Resource and action query parameters are required'
            });
        }

        // Find all user permissions where the specific resource and action are 'on'
        const userPermissions = await UserPermission.find({
            [`permissions.${resource}.${action}`]: true
        })
        .populate('user_id', 'username email mobile role')
        .populate('role', 'name description');

        res.status(200).json({
            success: true,
            message: 'Users with permission retrieved successfully',
            count: userPermissions.length,
            data: userPermissions
        });

    } catch (error) {
        console.error('Get users with permission error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving users with permission',
            error: error.message
        });
    }
};