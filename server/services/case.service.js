// server/services/case.service.js – Case number generation & validation
const prisma = require('../prisma/client');

/**
 * Generate the next case number for an organisation.
 * Format: PV-{YEAR}-{ORG_ID padded 2}-{SEQ padded 4}
 */
async function generateCaseNumber(orgId) {
  const year = new Date().getFullYear();
  const orgPad = String(orgId).padStart(2, '0');
  const prefix = `PV-${year}-${orgPad}-`;

  // Find the last case for this org + year
  const lastCase = await prisma.sptOrgCase.findFirst({
    where: {
      org_id: orgId,
      case_number: { startsWith: prefix },
    },
    orderBy: { case_number: 'desc' },
    select: { case_number: true },
  });

  let seq = 1;
  if (lastCase) {
    const lastSeq = parseInt(lastCase.case_number.split('-').pop(), 10);
    seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/**
 * Validate that a case belongs to the requesting user / org.
 * Returns the case or throws.
 */
async function validateCaseAccess(caseId, user) {
  const caseRecord = await prisma.sptOrgCase.findUnique({
    where: { case_id: caseId },
  });

  if (!caseRecord) {
    const err = new Error('Case not found');
    err.statusCode = 404;
    throw err;
  }

  // STUDENT can only access own cases or cases assigned to them
  if (user.role === 'STUDENT' && caseRecord.student_id !== user.user_id && caseRecord.assigned_to !== user.user_id) {
    const err = new Error('Access denied: not your case');
    err.statusCode = 403;
    throw err;
  }

  // INSTRUCTOR and ADMIN can access all cases in their org OR cases assigned to them
  if (
    ['INSTRUCTOR', 'ADMIN'].includes(user.role) &&
    caseRecord.org_id !== user.org_id &&
    caseRecord.assigned_to !== user.user_id
  ) {
    const err = new Error('Access denied: case belongs to another organisation');
    err.statusCode = 403;
    throw err;
  }

  return caseRecord;
}

/**
 * Assert case is in an editable state
 */
function assertEditable(caseRecord, user) {
  // As per user request: Allow saving in any workflow state.
  return;
}

module.exports = {
  generateCaseNumber,
  validateCaseAccess,
  assertEditable,
};
