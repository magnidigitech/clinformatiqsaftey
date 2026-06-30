// server/services/notification.service.js – Placeholder for future notifications

/**
 * Send a notification to a user.
 * Currently a no-op placeholder; will be implemented with
 * email / in-app notifications in a future iteration.
 */
async function sendNotification(userId, type, payload) {
  // TODO: Implement real notification delivery (email, WebSocket, push)
  console.log(`[NOTIFICATION] User ${userId} | Type: ${type} |`, payload);
  return { sent: false, reason: 'not_implemented' };
}

/**
 * Notify student that their case received feedback.
 */
async function notifyCaseFeedback(studentId, caseId, decision) {
  return sendNotification(studentId, 'CASE_FEEDBACK', {
    case_id: caseId,
    decision,
    message: `Your case #${caseId} has been ${decision}.`,
  });
}

/**
 * Notify instructor of a new case submission.
 */
async function notifyCaseSubmission(instructorIds, caseId, studentName) {
  const promises = instructorIds.map((id) =>
    sendNotification(id, 'CASE_SUBMITTED', {
      case_id: caseId,
      message: `${studentName} submitted case #${caseId} for review.`,
    })
  );
  return Promise.all(promises);
}

module.exports = {
  sendNotification,
  notifyCaseFeedback,
  notifyCaseSubmission,
};
