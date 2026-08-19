const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');

/**
 * GET /api/users/org (backward compatible)
 */
exports.getOrgUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        user_id: true,
        full_name: true,
        username: true,
        role: true,
        org_id: true,
        batch_id: true,
        batch: {
          select: { batch_id: true, name: true }
        },
        organisation: {
          select: { org_id: true, name: true, type: true }
        }
      },
      orderBy: { full_name: 'asc' },
    });
    res.json({ status: 'success', data: users });
  } catch (error) {
    console.error('Error fetching org users:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch organization users' });
  }
};

/**
 * GET /api/users - Fetch all users with organisation and batch info
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        user_id: true,
        username: true,
        full_name: true,
        email: true,
        role: true,
        status: true,
        created_at: true,
        org_id: true,
        batch_id: true,
        organisation: {
          select: { org_id: true, name: true, type: true }
        },
        batch: {
          select: { batch_id: true, name: true, status: true }
        },
        _count: {
          select: { sessions: true, cases: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users - Create new user with College and Batch assignment
 */
exports.createUser = async (req, res, next) => {
  try {
    const { username, password, full_name, email, role, org_id, batch_id } = req.body;

    if (!username || !password || !full_name || !email) {
      return res.status(400).json({ success: false, message: 'Username, password, full_name, and email are required.' });
    }

    const cleanUsername = username.trim();

    // Prevent username overlap (case-insensitive)
    const existingUser = await prisma.user.findFirst({
      where: {
        username: { equals: cleanUsername, mode: 'insensitive' }
      }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: `Username '${cleanUsername}' is already taken. Please choose a different username.` 
      });
    }

    let targetOrgId = null;
    let targetBatchId = null;

    if (role !== 'ADMIN') {
      targetOrgId = org_id ? parseInt(org_id) : req.user?.org_id;
      if (!targetOrgId) {
        const defaultOrg = await prisma.organisation.findFirst();
        if (defaultOrg) {
          targetOrgId = defaultOrg.org_id;
        } else {
          const newOrg = await prisma.organisation.create({ data: { name: 'Default College', type: 'COLLEGE' } });
          targetOrgId = newOrg.org_id;
        }
      }

      if (batch_id) {
        const bId = parseInt(batch_id);
        const batchExists = await prisma.batch.findUnique({ where: { batch_id: bId } });
        if (batchExists) {
          targetBatchId = bId;
        }
      }
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        password_hash,
        full_name: full_name.trim(),
        email: email.trim(),
        role: role || 'STUDENT',
        status: 'ACTIVE',
        org_id: targetOrgId,
        batch_id: targetBatchId
      },
      select: {
        user_id: true,
        username: true,
        full_name: true,
        email: true,
        role: true,
        status: true,
        created_at: true,
        org_id: true,
        batch_id: true,
        organisation: {
          select: { org_id: true, name: true, type: true }
        },
        batch: {
          select: { batch_id: true, name: true }
        }
      }
    });

    res.status(201).json({ success: true, data: newUser, message: 'User created successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/bulk - Bulk create users with College & Batch resolution
 */
exports.bulkCreateUsers = async (req, res, next) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ success: false, message: 'No user data provided for bulk import.' });
    }

    // Cache existing orgs and batches for quick resolution
    const orgs = await prisma.organisation.findMany({ include: { batches: true } });
    let defaultOrg = orgs[0];
    if (!defaultOrg) {
      defaultOrg = await prisma.organisation.create({ data: { name: 'Default College', type: 'COLLEGE' } });
      orgs.push(defaultOrg);
    }

    let createdCount = 0;
    let skippedCount = 0;
    const errors = [];
    const createdUsers = [];

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const rowNum = i + 1;

      const username = u.username ? String(u.username).trim() : '';
      const password = u.password ? String(u.password).trim() : 'Password123';
      const full_name = u.full_name || u.fullName || u.name || username;
      const email = u.email ? String(u.email).trim() : `${username}@institution.edu`;
      const role = u.role ? String(u.role).trim().toUpperCase() : 'STUDENT';
      const collegeName = u.college || u.college_name || u.organisation || u.org_name;
      const batchName = u.batch || u.batch_name;

      if (!username) {
        skippedCount++;
        errors.push(`Row ${rowNum}: Skipped due to missing username.`);
        continue;
      }

      // Case-insensitive duplicate check
      const existingUser = await prisma.user.findFirst({
        where: {
          username: { equals: username, mode: 'insensitive' }
        }
      });

      if (existingUser) {
        skippedCount++;
        errors.push(`Row ${rowNum}: Username '${username}' already exists.`);
        continue;
      }

      // Resolve College / Organisation
      let matchedOrg = defaultOrg;
      if (collegeName && String(collegeName).trim()) {
        const cTrim = String(collegeName).trim().toLowerCase();
        const found = orgs.find(o => o.name.toLowerCase() === cTrim);
        if (found) {
          matchedOrg = found;
        } else {
          // Check if marked as In-House
          const isInHouse = cTrim.includes('in-house') || cTrim.includes('inhouse');
          const createdOrg = await prisma.organisation.create({
            data: { name: String(collegeName).trim(), type: isInHouse ? 'IN_HOUSE' : 'COLLEGE' },
            include: { batches: true }
          });
          orgs.push(createdOrg);
          matchedOrg = createdOrg;
        }
      }

      // Resolve Batch
      let matchedBatchId = null;
      if (batchName && String(batchName).trim()) {
        const bTrim = String(batchName).trim().toLowerCase();
        let foundBatch = matchedOrg.batches?.find(b => b.name.toLowerCase() === bTrim);
        if (!foundBatch) {
          foundBatch = await prisma.batch.create({
            data: {
              name: String(batchName).trim(),
              org_id: matchedOrg.org_id,
              status: 'ACTIVE'
            }
          });
          if (!matchedOrg.batches) matchedOrg.batches = [];
          matchedOrg.batches.push(foundBatch);
        }
        matchedBatchId = foundBatch.batch_id;
      }

      try {
        const password_hash = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
          data: {
            username,
            password_hash,
            full_name,
            email,
            role: ['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(role) ? role : 'STUDENT',
            status: 'ACTIVE',
            org_id: matchedOrg.org_id,
            batch_id: matchedBatchId
          },
          select: {
            user_id: true,
            username: true,
            full_name: true,
            email: true,
            role: true,
            status: true,
            org_id: true,
            batch_id: true
          }
        });
        createdCount++;
        createdUsers.push(newUser);
      } catch (dbErr) {
        skippedCount++;
        errors.push(`Row ${rowNum} (${username}): ${dbErr.message}`);
      }
    }

    res.status(200).json({
      success: true,
      summary: {
        total: users.length,
        created: createdCount,
        skipped: skippedCount,
        errors
      },
      data: createdUsers,
      message: `Bulk import completed: ${createdCount} created, ${skippedCount} skipped.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id - Update user details, role, status, college, batch
 */
exports.updateUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { role, status, full_name, email, password, org_id, batch_id } = req.body;

    const dataToUpdate = {};
    if (role) dataToUpdate.role = role;
    if (status) dataToUpdate.status = status;
    if (full_name) dataToUpdate.full_name = full_name.trim();
    if (email) dataToUpdate.email = email.trim();

    if (role === 'ADMIN') {
      dataToUpdate.org_id = null;
      dataToUpdate.batch_id = null;
    } else {
      if (org_id !== undefined) dataToUpdate.org_id = org_id ? parseInt(org_id) : null;
      if (batch_id !== undefined) {
        dataToUpdate.batch_id = batch_id ? parseInt(batch_id) : null;
      }
    }

    if (password && password.trim().length > 0) {
      dataToUpdate.password_hash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { user_id: userId },
      data: dataToUpdate,
      select: {
        user_id: true,
        username: true,
        full_name: true,
        email: true,
        role: true,
        status: true,
        created_at: true,
        org_id: true,
        batch_id: true,
        organisation: {
          select: { org_id: true, name: true, type: true }
        },
        batch: {
          select: { batch_id: true, name: true, status: true }
        }
      }
    });

    if (status === 'INACTIVE') {
      await prisma.userSession.updateMany({
        where: { user_id: userId },
        data: { is_active: false }
      }).catch(() => {});
    }

    res.json({ success: true, data: updatedUser, message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/bulk-assign-batch - Assign multiple users to a college & batch
 */
exports.bulkAssignBatch = async (req, res, next) => {
  try {
    const { user_ids, org_id, batch_id } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No users selected.' });
    }

    const parsedUserIds = user_ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    const dataToUpdate = {};

    if (org_id) dataToUpdate.org_id = parseInt(org_id);
    if (batch_id !== undefined) {
      dataToUpdate.batch_id = batch_id ? parseInt(batch_id) : null;
    }

    const result = await prisma.user.updateMany({
      where: { user_id: { in: parsedUserIds } },
      data: dataToUpdate
    });

    res.json({
      success: true,
      data: result,
      message: `Successfully updated college/batch for ${result.count} user(s).`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/bulk-revoke-batch - Revoke/clear batch from multiple users
 */
exports.bulkRevokeBatch = async (req, res, next) => {
  try {
    const { user_ids } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No users selected.' });
    }

    const parsedUserIds = user_ids.map(id => parseInt(id)).filter(id => !isNaN(id));

    const result = await prisma.user.updateMany({
      where: { user_id: { in: parsedUserIds } },
      data: { batch_id: null }
    });

    res.json({
      success: true,
      data: result,
      message: `Successfully revoked batch assignment from ${result.count} user(s).`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/:id - Remove / Delete User
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent deletion of Administrator accounts
    const targetUser = await prisma.user.findUnique({
      where: { user_id: userId }
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (targetUser.role === 'ADMIN' || targetUser.username.toLowerCase() === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'System Administrator accounts are protected and cannot be deleted.'
      });
    }

    await prisma.userSession.deleteMany({
      where: { user_id: userId }
    }).catch(() => {});

    try {
      await prisma.user.delete({
        where: { user_id: userId }
      });
      res.json({ success: true, message: 'User permanently deleted.' });
    } catch (dbErr) {
      await prisma.user.update({
        where: { user_id: userId },
        data: { status: 'INACTIVE' }
      });
      res.json({ success: true, message: 'User deactivated (contained linked history data).' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/bulk-delete - Delete multiple users
 */
exports.bulkDeleteUsers = async (req, res, next) => {
  try {
    const { user_ids } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No users selected for deletion.' });
    }

    const parsedUserIds = user_ids.map(id => parseInt(id)).filter(id => !isNaN(id));

    // Exclude protected ADMIN accounts
    const nonAdminUsers = await prisma.user.findMany({
      where: {
        user_id: { in: parsedUserIds },
        role: { not: 'ADMIN' },
        username: { not: 'admin' }
      },
      select: { user_id: true }
    });

    const targetUserIds = nonAdminUsers.map(u => u.user_id);

    if (targetUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No eligible users to delete. Administrator accounts cannot be deleted.'
      });
    }

    // Delete user sessions first
    await prisma.userSession.deleteMany({
      where: { user_id: { in: targetUserIds } }
    }).catch(() => {});

    // Try deleting users without foreign key blockers
    let deletedCount = 0;
    let deactivatedCount = 0;

    for (const uId of targetUserIds) {
      try {
        await prisma.user.delete({ where: { user_id: uId } });
        deletedCount++;
      } catch (err) {
        await prisma.user.update({
          where: { user_id: uId },
          data: { status: 'INACTIVE' }
        });
        deactivatedCount++;
      }
    }

    res.json({
      success: true,
      message: `Successfully removed ${deletedCount + deactivatedCount} user(s) (${deletedCount} deleted, ${deactivatedCount} deactivated due to records). Admin accounts were preserved.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/sessions - Get all active sessions
 */
exports.getActiveSessions = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const currentToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    const sessions = await prisma.userSession.findMany({
      where: { is_active: true },
      include: {
        user: {
          select: {
            user_id: true,
            username: true,
            full_name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { last_active: 'desc' }
    });

    const enrichedSessions = sessions.map(s => ({
      session_id: s.session_id,
      user_id: s.user_id,
      ip_address: s.ip_address,
      user_agent: s.user_agent,
      is_active: s.is_active,
      created_at: s.created_at,
      last_active: s.last_active,
      user: s.user,
      is_current: currentToken ? s.token === currentToken : false
    }));

    res.json({ success: true, data: enrichedSessions });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/sessions/:id - Revoke single session
 */
exports.revokeSession = async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.id);
    const authHeader = req.headers.authorization;
    const currentToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    const session = await prisma.userSession.findUnique({
      where: { session_id: sessionId }
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (currentToken && session.token === currentToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot revoke your own active session. Use the Logout button in the header to sign out.' 
      });
    }

    await prisma.userSession.update({
      where: { session_id: sessionId },
      data: { is_active: false }
    });

    res.json({ success: true, message: 'Session revoked successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/sessions/user/:userId - Revoke all sessions for a user
 */
exports.revokeUserSessions = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const authHeader = req.headers.authorization;
    const currentToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    // Revoke sessions, excluding current active token if it's the current user
    const whereClause = { user_id: userId, is_active: true };
    if (currentToken && userId === req.user.user_id) {
      whereClause.token = { not: currentToken };
    }

    await prisma.userSession.updateMany({
      where: whereClause,
      data: { is_active: false }
    });

    res.json({ success: true, message: 'All sessions for the user revoked.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/sessions/bulk-revoke - Revoke multiple sessions at once
 */
exports.bulkRevokeSessions = async (req, res, next) => {
  try {
    const { session_ids } = req.body;
    if (!session_ids || !Array.isArray(session_ids) || session_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'session_ids array is required' });
    }

    const authHeader = req.headers.authorization;
    const currentToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    const ids = session_ids.map(id => parseInt(id)).filter(id => !isNaN(id));

    const whereClause = {
      session_id: { in: ids },
      is_active: true
    };

    if (currentToken) {
      whereClause.token = { not: currentToken };
    }

    const result = await prisma.userSession.updateMany({
      where: whereClause,
      data: { is_active: false }
    });

    res.json({
      success: true,
      message: `Successfully revoked ${result.count} session(s).`,
      count: result.count
    });
  } catch (error) {
    next(error);
  }
};
