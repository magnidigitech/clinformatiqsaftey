const prisma = require('../prisma/client');

/**
 * GET /api/colleges
 * List all colleges / in-house organisations with batches and active users count
 */
exports.getAllColleges = async (req, res, next) => {
  try {
    const colleges = await prisma.organisation.findMany({
      include: {
        batches: {
          select: {
            batch_id: true,
            name: true,
            status: true,
            _count: { select: { users: true } }
          },
          orderBy: { name: 'asc' }
        },
        _count: {
          select: {
            users: true,
            batches: true,
            cases: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: colleges });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/colleges
 * Create a new College or In-House unit
 */
exports.createCollege = async (req, res, next) => {
  try {
    const { name, type = 'COLLEGE', status = 'ACTIVE' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'College name is required' });
    }

    const orgType = type === 'IN_HOUSE' ? 'IN_HOUSE' : 'COLLEGE';
    const orgStatus = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const college = await prisma.organisation.create({
      data: {
        name: name.trim(),
        type: orgType,
        status: orgStatus
      },
      include: {
        batches: true,
        _count: { select: { users: true, batches: true } }
      }
    });

    res.status(201).json({ success: true, data: college, message: `${orgType === 'IN_HOUSE' ? 'In-House Unit' : 'College'} created successfully.` });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/colleges/:id
 * Update College name, type (COLLEGE / IN_HOUSE), or status (ACTIVE / INACTIVE)
 */
exports.updateCollege = async (req, res, next) => {
  try {
    const orgId = parseInt(req.params.id);
    const { name, type, status } = req.body;

    const dataToUpdate = {};
    if (name && name.trim()) dataToUpdate.name = name.trim();
    if (type) dataToUpdate.type = type === 'IN_HOUSE' ? 'IN_HOUSE' : 'COLLEGE';
    if (status) dataToUpdate.status = status;

    const updated = await prisma.organisation.update({
      where: { org_id: orgId },
      data: dataToUpdate,
      include: {
        batches: true,
        _count: { select: { users: true, batches: true } }
      }
    });

    // Cascade status changes to all batches and users under this college
    if (status) {
      if (status === 'INACTIVE') {
        // Set all batches in this college to INACTIVE
        await prisma.batch.updateMany({
          where: { org_id: orgId },
          data: { status: 'INACTIVE' }
        });

        // Find users in this college
        const orgUsers = await prisma.user.findMany({
          where: { org_id: orgId, role: { not: 'ADMIN' } },
          select: { user_id: true }
        });
        const userIds = orgUsers.map(u => u.user_id);

        if (userIds.length > 0) {
          // Set students/instructors to INACTIVE
          await prisma.user.updateMany({
            where: { user_id: { in: userIds } },
            data: { status: 'INACTIVE' }
          });

          // Revoke all their active sessions
          await prisma.userSession.updateMany({
            where: { user_id: { in: userIds }, is_active: true },
            data: { is_active: false }
          }).catch(() => {});
        }
      } else if (status === 'ACTIVE') {
        // Set all batches in this college to ACTIVE
        await prisma.batch.updateMany({
          where: { org_id: orgId },
          data: { status: 'ACTIVE' }
        });

        // Set all users in this college to ACTIVE
        await prisma.user.updateMany({
          where: { org_id: orgId },
          data: { status: 'ACTIVE' }
        });
      }
    }

    res.json({ success: true, data: updated, message: 'College updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/colleges/:id
 * Delete College (only if no users or cases exist, or safe cascade)
 */
exports.deleteCollege = async (req, res, next) => {
  try {
    const orgId = parseInt(req.params.id);

    const userCount = await prisma.user.count({ where: { org_id: orgId } });
    if (userCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete college: ${userCount} user(s) are currently assigned to it. Reassign users first.` 
      });
    }

    await prisma.organisation.delete({
      where: { org_id: orgId }
    });

    res.json({ success: true, message: 'College removed successfully' });
  } catch (error) {
    next(error);
  }
};
