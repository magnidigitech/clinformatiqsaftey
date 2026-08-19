// server/middleware/auth.middleware.js – JWT verification
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('Authentication required. No token provided.');
      error.statusCode = 401;
      throw error;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user data from DB to avoid stale org_id or status from JWT
    const dbUser = await prisma.user.findUnique({
      where: { user_id: decoded.user_id },
      select: { 
        user_id: true, 
        username: true, 
        role: true, 
        org_id: true, 
        status: true,
        batch_id: true,
        organisation: { select: { status: true } },
        batch: { select: { status: true } }
      },
    });

    if (!dbUser || dbUser.status !== 'ACTIVE') {
      const error = new Error('User account is inactive or not found.');
      error.statusCode = 401;
      throw error;
    }

    if (dbUser.role === 'STUDENT') {
      if (dbUser.organisation && dbUser.organisation.status === 'INACTIVE') {
        const error = new Error('Your College / Organisation is currently inactive.');
        error.statusCode = 401;
        throw error;
      }
      if (dbUser.batch && dbUser.batch.status === 'INACTIVE') {
        const error = new Error('Your assigned Batch is currently inactive.');
        error.statusCode = 401;
        throw error;
      }
    }

    // Check if session has been revoked
    const session = await prisma.userSession.findUnique({
      where: { token },
    });

    if (session && !session.is_active) {
      const error = new Error('Session has been revoked.');
      error.statusCode = 401;
      throw error;
    }

    // Attach fresh user payload to request
    req.user = {
      user_id: dbUser.user_id,
      username: dbUser.username,
      role: dbUser.role,
      org_id: dbUser.org_id,
    };

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      err.message = 'Invalid token';
      err.statusCode = 401;
    }
    if (err.name === 'TokenExpiredError') {
      err.message = 'Token has expired';
      err.statusCode = 401;
    }
    if (!err.statusCode) err.statusCode = 401;
    next(err);
  }
};

module.exports = authenticate;
