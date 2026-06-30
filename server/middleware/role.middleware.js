// server/middleware/role.middleware.js – Role-based authorisation
/**
 * Factory that returns middleware checking req.user.role
 * against a whitelist of allowed roles.
 *
 * Usage:  requireRole('ADMIN', 'INSTRUCTOR')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      return next(err);
    }

    if (!roles.includes(req.user.role)) {
      const err = new Error(
        `Access denied. Required role(s): ${roles.join(', ')}`
      );
      err.statusCode = 403;
      return next(err);
    }

    next();
  };
};

module.exports = requireRole;
