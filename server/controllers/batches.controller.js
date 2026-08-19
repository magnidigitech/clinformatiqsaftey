const prisma = require('../prisma/client');

/**
 * GET /api/batches
 * Get all batches (optionally filter by org_id)
 */
exports.getAllBatches = async (req, res, next) => {
  try {
    const { org_id } = req.query;
    const where = {};
    if (org_id) where.org_id = parseInt(org_id);

    const batches = await prisma.batch.findMany({
      where,
      include: {
        organisation: {
          select: { org_id: true, name: true, type: true }
        },
        users: {
          select: {
            user_id: true,
            username: true,
            full_name: true,
            email: true,
            role: true,
            status: true
          }
        },
        _count: {
          select: { users: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ success: true, data: batches });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/batches
 * Create a new Batch
 */
exports.createBatch = async (req, res, next) => {
  try {
    const { name, org_id, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Batch name is required.' });
    }

    if (!org_id) {
      return res.status(400).json({ success: false, message: 'College / Organisation selection is required for a batch.' });
    }

    const targetOrgId = parseInt(org_id);

    const orgExists = await prisma.organisation.findUnique({ where: { org_id: targetOrgId } });
    if (!orgExists) {
      return res.status(404).json({ success: false, message: 'Selected College / Organisation does not exist.' });
    }

    const batch = await prisma.batch.create({
      data: {
        name: name.trim(),
        org_id: targetOrgId,
        description: description ? description.trim() : null,
        status: 'ACTIVE'
      },
      include: {
        organisation: {
          select: { org_id: true, name: true, type: true }
        },
        _count: { select: { users: true } }
      }
    });

    res.status(201).json({ success: true, data: batch, message: `Batch '${batch.name}' created successfully.` });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/batches/:id
 * Update batch name, description, status, or transfer to another college
 */
exports.updateBatch = async (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const { name, description, status, org_id } = req.body;

    const dataToUpdate = {};
    if (name && name.trim()) dataToUpdate.name = name.trim();
    if (description !== undefined) dataToUpdate.description = description ? description.trim() : null;
    if (status) dataToUpdate.status = status;
    if (org_id) dataToUpdate.org_id = parseInt(org_id);

    const updated = await prisma.batch.update({
      where: { batch_id: batchId },
      data: dataToUpdate,
      include: {
        organisation: {
          select: { org_id: true, name: true, type: true, status: true }
        },
        _count: { select: { users: true } }
      }
    });

    // Cascade status change to all assigned users
    if (status) {
      const batchUsers = await prisma.user.findMany({
        where: { batch_id: batchId },
        select: { user_id: true }
      });
      const userIds = batchUsers.map(u => u.user_id);

      if (userIds.length > 0) {
        if (status === 'INACTIVE') {
          // Set assigned students to INACTIVE
          await prisma.user.updateMany({
            where: { user_id: { in: userIds }, role: 'STUDENT' },
            data: { status: 'INACTIVE' }
          });
          // Revoke all their active sessions immediately
          await prisma.userSession.updateMany({
            where: { user_id: { in: userIds }, is_active: true },
            data: { is_active: false }
          }).catch(() => {});
        } else if (status === 'ACTIVE') {
          // Set assigned students back to ACTIVE
          await prisma.user.updateMany({
            where: { user_id: { in: userIds }, role: 'STUDENT' },
            data: { status: 'ACTIVE' }
          });
        }
      }
    }

    res.json({ success: true, data: updated, message: 'Batch updated successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/batches/:id
 * Delete batch and detach students
 */
exports.deleteBatch = async (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);

    // Detach all students first
    await prisma.user.updateMany({
      where: { batch_id: batchId },
      data: { batch_id: null }
    });

    await prisma.batch.delete({
      where: { batch_id: batchId }
    });

    res.json({ success: true, message: 'Batch removed successfully. Any assigned students have been detached.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/batches/:id/assign
 * Bulk assign an array of user_ids to this batch
 */
exports.assignStudentsToBatch = async (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const { user_ids } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No user IDs provided for assignment.' });
    }

    const batch = await prisma.batch.findUnique({
      where: { batch_id: batchId },
      include: { organisation: true }
    });

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    const parsedUserIds = user_ids.map(id => parseInt(id)).filter(id => !isNaN(id));

    // Update batch and ensure users belong to the batch's organisation
    const result = await prisma.user.updateMany({
      where: { user_id: { in: parsedUserIds } },
      data: {
        batch_id: batchId,
        org_id: batch.org_id
      }
    });

    res.json({
      success: true,
      data: result,
      message: `Successfully assigned ${result.count} student(s) to batch '${batch.name}' (${batch.organisation.name}).`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/batches/:id/revoke
 * Bulk revoke / remove students from this batch
 */
exports.revokeStudentsFromBatch = async (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const { user_ids } = req.body;

    const whereClause = { batch_id: batchId };
    if (Array.isArray(user_ids) && user_ids.length > 0) {
      const parsedUserIds = user_ids.map(id => parseInt(id)).filter(id => !isNaN(id));
      whereClause.user_id = { in: parsedUserIds };
    }

    const result = await prisma.user.updateMany({
      where: whereClause,
      data: { batch_id: null }
    });

    res.json({
      success: true,
      data: result,
      message: `Successfully revoked batch assignment for ${result.count} student(s).`
    });
  } catch (error) {
    next(error);
  }
};
