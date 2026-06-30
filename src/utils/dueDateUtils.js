/**
 * Due Date Utility Functions
 * 
 * Computes due dates for pharmacovigilance cases based on workflow state:
 * - Data Entry (DRAFT/SUBMITTED): due 2 days after case creation
 * - QC (PENDING_QC): due 2 days after routing to QC
 */

const DUE_DAYS = 2;

/**
 * Get the due date for a case based on its workflow state.
 * @param {Object} caseData - The case object with created_at, workflow_state, and workflow_logs
 * @returns {{ dueDate: Date|null, phase: string|null }}
 */
export function getDueDate(caseData) {
  if (!caseData) return { dueDate: null, phase: null };

  const state = caseData.workflow_state;

  // Completed/closed cases have no due date
  if (state === 'APPROVED' || state === 'CLOSED' || state === 'COMPLETED') {
    return { dueDate: null, phase: null };
  }

  // QC phase: due 2 days from the most recent routing to PENDING_QC
  if (state === 'PENDING_QC') {
    const logs = caseData.workflow_logs || [];
    const qcLog = [...logs]
      .reverse()
      .find(log => log.to_state === 'PENDING_QC');
    
    if (qcLog) {
      const routedAt = new Date(qcLog.action_time);
      const due = new Date(routedAt);
      due.setDate(due.getDate() + DUE_DAYS);
      return { dueDate: due, phase: 'QC' };
    }
  }

  // Data Entry phase (DRAFT, SUBMITTED, NEEDS_REVISION, etc.)
  if (caseData.created_at) {
    const createdAt = new Date(caseData.created_at);
    const due = new Date(createdAt);
    due.setDate(due.getDate() + DUE_DAYS);
    return { dueDate: due, phase: 'Data Entry' };
  }

  return { dueDate: null, phase: null };
}

/**
 * Get the urgency status of a due date.
 * @param {Date} dueDate
 * @returns {'overdue'|'due-today'|'due-soon'|'on-track'|null}
 */
export function getDueStatus(dueDate) {
  if (!dueDate) return null;

  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) return 'overdue';
  if (diffHours < 24) return 'due-today';
  if (diffHours < 48) return 'due-soon';
  return 'on-track';
}

/**
 * Format a date as DD-MMM-YYYY
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDueDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${d.getDate().toString().padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

/**
 * Get CSS classes for due date badge based on status.
 * @param {string} status - from getDueStatus
 * @returns {string} CSS classes
 */
export function getDueBadgeClasses(status) {
  switch (status) {
    case 'overdue':
      return 'bg-red-50 border-red-300 text-red-700';
    case 'due-today':
      return 'bg-orange-50 border-orange-300 text-orange-700';
    case 'due-soon':
      return 'bg-amber-50 border-amber-300 text-amber-700';
    case 'on-track':
      return 'bg-green-50 border-green-300 text-green-700';
    default:
      return 'bg-slate-50 border-slate-200 text-slate-500';
  }
}

/**
 * Get a human-readable label for the due status.
 * @param {string} status
 * @returns {string}
 */
export function getDueLabel(status) {
  switch (status) {
    case 'overdue': return 'Overdue';
    case 'due-today': return 'Due Today';
    case 'due-soon': return 'Due Soon';
    case 'on-track': return 'On Track';
    default: return '';
  }
}
