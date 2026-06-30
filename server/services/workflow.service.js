// server/services/workflow.service.js – Workflow state machine
const prisma = require('../prisma/client');

/**
 * Allowed transitions: { fromState: [{ to, roles }] }
 */
const TRANSITIONS = {
  DRAFT: [
    { to: 'SUBMITTED', roles: ['STUDENT'] },
  ],
  SUBMITTED: [
    { to: 'UNDER_REVIEW', roles: ['INSTRUCTOR', 'ADMIN'] },
  ],
  UNDER_REVIEW: [
    { to: 'ACCEPTED', roles: ['INSTRUCTOR', 'ADMIN'] },
    { to: 'NEEDS_REVISION', roles: ['INSTRUCTOR', 'ADMIN'] },
  ],
  NEEDS_REVISION: [
    { to: 'SUBMITTED', roles: ['STUDENT'] },
  ],
  ACCEPTED: [],
};

/**
 * Validate a state transition and return the matching transition object.
 */
function validateTransition(fromState, toState, role) {
  const allowed = TRANSITIONS[fromState];
  if (!allowed) {
    const err = new Error(`No transitions defined from state "${fromState}"`);
    err.statusCode = 400;
    throw err;
  }

  const match = allowed.find((t) => t.to === toState);
  if (!match) {
    const err = new Error(
      `Transition from "${fromState}" to "${toState}" is not allowed`
    );
    err.statusCode = 400;
    throw err;
  }

  if (!match.roles.includes(role)) {
    const err = new Error(
      `Role "${role}" cannot perform transition from "${fromState}" to "${toState}"`
    );
    err.statusCode = 403;
    throw err;
  }

  return match;
}

/**
 * Advance a case through the workflow.
 * Updates the case state and creates a workflow log entry.
 */
async function advanceWorkflow(caseId, toState, userId, role, comments) {
  const caseRecord = await prisma.sptOrgCase.findUnique({
    where: { case_id: caseId },
  });

  if (!caseRecord) {
    const err = new Error('Case not found');
    err.statusCode = 404;
    throw err;
  }

  const fromState = caseRecord.workflow_state;

  // Validate the transition
  validateTransition(fromState, toState, role);

  // Perform update + log in a transaction
  const [updatedCase, logEntry] = await prisma.$transaction([
    prisma.sptOrgCase.update({
      where: { case_id: caseId },
      data: { workflow_state: toState },
    }),
    prisma.workflowLog.create({
      data: {
        case_id: caseId,
        from_state: fromState,
        to_state: toState,
        actioned_by: userId,
        comments: comments || null,
      },
    }),
  ]);

  return { updatedCase, logEntry };
}

/**
 * Get the workflow history for a case.
 */
async function getWorkflowHistory(caseId) {
  return prisma.workflowLog.findMany({
    where: { case_id: caseId },
    orderBy: { action_time: 'asc' },
    include: {
      user: {
        select: { user_id: true, username: true, full_name: true, role: true },
      },
    },
  });
}

module.exports = {
  TRANSITIONS,
  validateTransition,
  advanceWorkflow,
  getWorkflowHistory,
};
