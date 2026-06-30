// server/controllers/auth.controller.js – Authentication logic
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');

const SALT_ROUNDS = 10;

/**
 * POST /api/auth/register-admin
 * Register an admin user and create a new organisation.
 */
async function registerAdmin(req, res, next) {
  try {
    const { username, password, full_name, email, org_name } = req.body;

    if (!username || !password || !full_name || !email) {
      const err = new Error('username, password, full_name, and email are required');
      err.statusCode = 400;
      throw err;
    }

    if (!org_name) {
      const err = new Error('org_name is required for admin registration');
      err.statusCode = 400;
      throw err;
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await prisma.$transaction(async (tx) => {
      let org = await tx.organisation.findFirst({
        where: { name: org_name },
      });

      if (!org) {
        org = await tx.organisation.create({
          data: { name: org_name, type: 'COLLEGE' },
        });
      }

      const user = await tx.user.create({
        data: {
          username,
          password_hash,
          role: 'ADMIN',
          org_id: org.org_id,
          full_name,
          email,
          status: 'ACTIVE',
        },
      });

      return { org, user };
    });

    const token = jwt.sign(
      {
        user_id: result.user.user_id,
        username: result.user.username,
        role: result.user.role,
        org_id: result.user.org_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password_hash: _, ...userSafe } = result.user;

    res.status(201).json({
      success: true,
      data: { token, user: userSafe, organisation: result.org },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/register-user
 * Register a regular user (student) and join an existing organisation.
 */
async function registerUser(req, res, next) {
  try {
    const { username, password, full_name, email, org_name } = req.body;

    if (!username || !password || !full_name || !email || !org_name) {
      const err = new Error('username, password, full_name, email, and org_name are required');
      err.statusCode = 400;
      throw err;
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await prisma.$transaction(async (tx) => {
      let org = await tx.organisation.findFirst({
        where: { name: org_name },
      });

      if (!org) {
        org = await tx.organisation.create({
          data: { name: org_name, type: 'COLLEGE' },
        });
      }

      const user = await tx.user.create({
        data: {
          username,
          password_hash,
          role: 'STUDENT',
          org_id: org.org_id,
          full_name,
          email,
          status: 'ACTIVE',
        },
      });

      return { org, user };
    });

    const token = jwt.sign(
      {
        user_id: result.user.user_id,
        username: result.user.username,
        role: result.user.role,
        org_id: result.user.org_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password_hash: _, ...userSafe } = result.user;

    res.status(201).json({
      success: true,
      data: { token, user: userSafe, organisation: result.org },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login-admin
 */
async function loginAdmin(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      const err = new Error('username and password are required');
      err.statusCode = 400;
      throw err;
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { organisation: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    if (user.role !== 'ADMIN') {
      const err = new Error('Unauthorized. This portal is for administrators only.');
      err.statusCode = 403;
      throw err;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        org_id: user.org_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password_hash: _, ...userSafe } = user;

    res.json({
      success: true,
      data: { token, user: userSafe },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login-user
 */
async function loginUser(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      const err = new Error('username and password are required');
      err.statusCode = 400;
      throw err;
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { organisation: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    if (user.role === 'ADMIN') {
      const err = new Error('Unauthorized. Administrators must use the Admin Login portal.');
      err.statusCode = 403;
      throw err;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        org_id: user.org_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password_hash: _, ...userSafe } = user;

    res.json({
      success: true,
      data: { token, user: userSafe },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Stateless JWT – just return success.
 */
async function logout(req, res) {
  res.json({ success: true, message: 'Logged out successfully' });
}

/**
 * GET /api/auth/me
 */
async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
      include: { organisation: true },
    });

    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    const { password_hash: _, ...userSafe } = user;

    res.json({ success: true, data: userSafe });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/change-password
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      const err = new Error('Current password and new password are required');
      err.statusCode = 400;
      throw err;
    }

    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
    });

    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      const err = new Error('Invalid current password');
      err.statusCode = 401;
      throw err;
    }

    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { user_id: req.user.user_id },
      data: { password_hash },
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/organisations
 */
async function getOrganisations(req, res, next) {
  try {
    const orgs = await prisma.organisation.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: orgs });
  } catch (err) {
    next(err);
  }
}

module.exports = { registerAdmin, registerUser, loginAdmin, loginUser, logout, me, changePassword, getOrganisations };
