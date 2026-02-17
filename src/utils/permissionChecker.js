// utils/permissionChecker.js
const UserPermission = require('../models/userPermission');
const Role = require('../models/roles')

class PermissionChecker {
    static ON = 'on';
    static OFF = 'off';

    /**
     * Check if a user has permission for a specific resource and action
     * @param {String} userId - User ID
     * @param {String} resource - Resource name (e.g., 'orders', 'products')
     * @param {String} action - Action type ('create', 'read', 'update', 'delete')
     * @returns {Boolean} True if user has permission
     */
    static async hasPermission(userId, resource, action) {
        try {
            // Find user permission document
            const userPermission = await UserPermission.findOne({ user_id: userId })
                .populate('role', 'role '); // Populate role if needed

            if (!userPermission) {
                // If no user-specific permissions exist, check role-level permissions
                // This assumes your Role model might have default permissions
                return await this.checkRolePermissions(userId, resource, action);
            }

            // Check user-specific permissions first
            const permissions = userPermission.permissions || new Map();
            const resourcePermissions = permissions.get(resource);
            
            // If user has specific permission set, use it
            if (resourcePermissions && resourcePermissions[action] !== undefined) {
                return resourcePermissions[action] === this.ON;
            }

            // Fall back to role-level permissions
            return await this.checkRolePermissions(userPermission.role, resource, action);
            
        } catch (error) {
            console.error('Permission check error:', error);
            return false;
        }
    }

    /**
     * Check role-level permissions (fallback method)
     */
    static async checkRolePermissions(roleId, resource, action) {
        try {
            // Assuming you have a Role model with permissions
            // This is optional - you can remove if you only use UserPermission
            const Role = require('../models/roles'); // Import only when needed
            const role = await Role.findById(roleId);
            
            if (!role ) {
                return false;
            }

            // Check if role has the permission
            // This depends on how your Role model is structured
            // Example: role.permissions[resource][action] === true
            return role || false;
            
        } catch (error) {
            console.error('Role permission check error:', error);
            return false;
        }
    }

    /**
     * Check if user has ANY of the required permissions
     */
    static async hasAnyPermission(userId, requiredPermissions = []) {
        try {
            const userPermission = await UserPermission.findOne({ user_id: userId });

            if (!userPermission) {
                return false;
            }

            const permissions = userPermission.permissions || new Map();
            
            for (const { resource, action } of requiredPermissions) {
                const resourcePermissions = permissions.get(resource);
                if (resourcePermissions && resourcePermissions[action] === this.ON) {
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('Has any permission error:', error);
            return false;
        }
    }

    /**
     * Check if user has ALL of the required permissions
     */
    static async hasAllPermissions(userId, requiredPermissions = []) {
        try {
            const userPermission = await UserPermission.findOne({ user_id: userId });

            if (!userPermission) {
                return false;
            }

            const permissions = userPermission.permissions || new Map();
            
            for (const { resource, action } of requiredPermissions) {
                const resourcePermissions = permissions.get(resource);
                if (!resourcePermissions || resourcePermissions[action] !== this.ON) {
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Has all permissions error:', error);
            return false;
        }
    }

    /**
     * Get all permissions for a user
     */
    static async getUserPermissions(userId) {
        try {
            const userPermission = await UserPermission.findOne({ user_id: userId })
                .populate('role', 'name');

            if (!userPermission) {
                return {
                    user_id: userId,
                    permissions: {},
                    role: null
                };
            }

            // Convert Map to object for easier use
            const permissionsObj = {};
            if (userPermission.permissions) {
                userPermission.permissions.forEach((value, key) => {
                    permissionsObj[key] = { ...value };
                });
            }

            return {
                user_id: userPermission.user_id,
                permissions: permissionsObj,
                role: userPermission.role,
                createdAt: userPermission.createdAt,
                updatedAt: userPermission.updatedAt
            };
        } catch (error) {
            console.error('Get user permissions error:', error);
            throw error;
        }
    }

    /**
     * Middleware to check permission for a specific route
     */
    static requirePermission(resource, action) {
        return async (req, res, next) => {
            try {
                if (!req.user || !req.user.id) {
                    return res.status(401).json({
                        success: false,
                        message: "Authentication required"
                    });
                }

                const hasPermission = await this.hasPermission(req.user.id, resource, action);
                
                if (!hasPermission) {
                    return res.status(403).json({
                        success: false,
                        message: `You don't have permission to ${action} ${resource}`
                    });
                }
                
                next();
            } catch (error) {
                console.error('Permission middleware error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error checking permissions',
                    error: NODE_ENV === 'development' ? error.message : undefined
                });
            }
        };
    }

    /**
     * Middleware to check ANY of the required permissions
     */
    static requireAnyPermission(requiredPermissions = []) {
        return async (req, res, next) => {
            try {
                if (!req.user || !req.user.id) {
                    return res.status(401).json({
                        success: false,
                        message: "Authentication required"
                    });
                }

                const hasAnyPermission = await this.hasAnyPermission(req.user.id, requiredPermissions);
                
                if (!hasAnyPermission) {
                    return res.status(403).json({
                        success: false,
                        message: "You don't have sufficient permissions for this action"
                    });
                }
                
                next();
            } catch (error) {
                console.error('Require any permission middleware error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error checking permissions'
                });
            }
        };
    }

    /**
     * Middleware to check ALL of the required permissions
     */
    static requireAllPermissions(requiredPermissions = []) {
        return async (req, res, next) => {
            try {
                if (!req.user || !req.user.id) {
                    return res.status(401).json({
                        success: false,
                        message: "Authentication required"
                    });
                }

                const hasAllPermissions = await this.hasAllPermissions(req.user.id, requiredPermissions);
                
                if (!hasAllPermissions) {
                    return res.status(403).json({
                        success: false,
                        message: "You don't have all required permissions for this action"
                    });
                }
                
                next();
            } catch (error) {
                console.error('Require all permissions middleware error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error checking permissions'
                });
            }
        };
    }
}

module.exports = PermissionChecker;