// server/controllers/workflow.controller.js – Workflow history & advance
const { validateCaseAccess } = require('../services/case.service');
const workflowService = require('../services/workflow.service');

/**
 * GET /api/cases/:id/workflow
 */
async function getHistory(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    await validateCaseAccess(caseId, req.user);

    const history = await workflowService.getWorkflowHistory(caseId);

    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cases/:id/workflow/advance
 * Body: { to_state, comments }
 */
async function advance(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    await validateCaseAccess(caseId, req.user);

    const { to_state, comments } = req.body;

    if (!to_state) {
      const err = new Error('to_state is required');
      err.statusCode = 400;
      throw err;
    }

    const result = await workflowService.advanceWorkflow(
      caseId,
      to_state,
      req.user.user_id,
      req.user.role,
      comments
    );

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { getHistory, advance };
