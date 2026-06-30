// server/controllers/feedback.controller.js – Instructor feedback
const prisma = require('../prisma/client');
const { validateCaseAccess } = require('../services/case.service');
const workflowService = require('../services/workflow.service');
const { notifyCaseFeedback } = require('../services/notification.service');

/**
 * POST /api/cases/:id/feedback
 * Body: { score, comments, decision: 'ACCEPTED' | 'NEEDS_REVISION' }
 */
async function create(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    const caseRecord = await validateCaseAccess(caseId, req.user);

    // Only INSTRUCTOR or ADMIN can leave feedback
    if (!['INSTRUCTOR', 'ADMIN'].includes(req.user.role)) {
      const err = new Error('Only instructors or admins can provide feedback');
      err.statusCode = 403;
      throw err;
    }

    // Case must be in UNDER_REVIEW state
    if (caseRecord.workflow_state !== 'UNDER_REVIEW') {
      const err = new Error(
        `Cannot provide feedback on a case in state "${caseRecord.workflow_state}". Case must be UNDER_REVIEW.`
      );
      err.statusCode = 400;
      throw err;
    }

    const { score, comments, decision } = req.body;

    if (!decision || !['ACCEPTED', 'NEEDS_REVISION'].includes(decision)) {
      const err = new Error('decision must be "ACCEPTED" or "NEEDS_REVISION"');
      err.statusCode = 400;
      throw err;
    }

    // Create feedback and advance workflow in a transaction
    const [feedback] = await prisma.$transaction([
      prisma.instructorFeedback.create({
        data: {
          case_id: caseId,
          instructor_id: req.user.user_id,
          score: score != null ? parseInt(score, 10) : null,
          comments: comments || null,
          decision,
        },
      }),
    ]);

    // Advance workflow state
    await workflowService.advanceWorkflow(
      caseId,
      decision,
      req.user.user_id,
      req.user.role,
      comments || `Decision: ${decision}`
    );

    // Send notification (non-blocking)
    notifyCaseFeedback(caseRecord.student_id, caseId, decision).catch(() => {});

    res.status(201).json({ success: true, data: feedback });
  } catch (err) {
    next(err);
  }
}

module.exports = { create };
