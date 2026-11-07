// server/services/case.service.js – Case number generation & validation
const prisma = require('../prisma/client');

/**
 * Generate the next case number for an organisation.
 * Format: PV-{YEAR}-{ORG_ID padded 2}-{SEQ padded 4}
 */
async function generateCaseNumber(orgId) {
  const effectiveOrgId = (orgId != null && !isNaN(orgId)) ? parseInt(orgId, 10) : 6;
  const year = new Date().getFullYear();
  const orgPad = String(effectiveOrgId).padStart(2, '0');
  const prefix = `PV-${year}-${orgPad}-`;

  // Find the last case for this org + year
  const lastCase = await prisma.sptOrgCase.findFirst({
    where: {
      org_id: effectiveOrgId,
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

  // INSTRUCTOR and ADMIN can access all cases in their org OR cases assigned to them (Super Admin without org_id has system-wide access)
  if (
    ['INSTRUCTOR', 'ADMIN'].includes(user.role) &&
    user.org_id != null &&
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
 * Assert case is in an editable state.
 * Cases in QC_COMPLETED state are strictly read-only.
 */
function assertEditable(caseRecord, user) {
  if (caseRecord && caseRecord.workflow_state === 'QC_COMPLETED') {
    const err = new Error('This case has completed QC and is read-only. Modifications are not allowed.');
    err.statusCode = 403;
    throw err;
  }
}

module.exports = {
  generateCaseNumber,
  validateCaseAccess,
  assertEditable,
};
