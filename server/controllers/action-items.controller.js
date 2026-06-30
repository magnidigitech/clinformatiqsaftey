// server/controllers/action-items.controller.js - Action Items CRUD
const prisma = require('../prisma/client');
const { validateCaseAccess } = require('../services/case.service');

async function list(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    await validateCaseAccess(caseId, req.user);

    const actionItems = await prisma.caseActionItem.findMany({
      where: { case_id: caseId },
      orderBy: { action_id: 'asc' },
    });

    res.json({ success: true, data: actionItems });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    await validateCaseAccess(caseId, req.user);

    const { action_type, description, due_date, status, assigned_to } = req.body;

    const actionItem = await prisma.caseActionItem.create({
      data: {
        case_id: caseId,
        action_type,
        description: description || null,
        due_date: due_date ? new Date(due_date) : null,
        status: status || 'OPEN',
        assigned_to: assigned_to ? parseInt(assigned_to, 10) : null,
      },
    });

    res.status(201).json({ success: true, data: actionItem });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    const actionId = parseInt(req.params.actionId, 10);
    await validateCaseAccess(caseId, req.user);

    const existing = await prisma.caseActionItem.findFirst({
      where: { action_id: actionId, case_id: caseId },
    });

    if (!existing) {
      const err = new Error('Action item not found for this case');
      err.statusCode = 404;
      throw err;
    }

    const { action_type, description, due_date, status, assigned_to, completed_at } = req.body;

    const actionItem = await prisma.caseActionItem.update({
      where: { action_id: actionId },
      data: {
        action_type: action_type !== undefined ? action_type : undefined,
        description: description !== undefined ? description : undefined,
        due_date: due_date !== undefined ? (due_date ? new Date(due_date) : null) : undefined,
        status: status !== undefined ? status : undefined,
        assigned_to: assigned_to !== undefined ? (assigned_to ? parseInt(assigned_to, 10) : null) : undefined,
        completed_at: completed_at !== undefined ? (completed_at ? new Date(completed_at) : null) : undefined,
      },
    });

    res.json({ success: true, data: actionItem });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    const actionId = parseInt(req.params.actionId, 10);
    await validateCaseAccess(caseId, req.user);

    const existing = await prisma.caseActionItem.findFirst({
      where: { action_id: actionId, case_id: caseId },
    });

    if (!existing) {
      const err = new Error('Action item not found for this case');
      err.statusCode = 404;
      throw err;
    }

    await prisma.caseActionItem.delete({
      where: { action_id: actionId },
    });

    res.json({ success: true, message: 'Action item deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
