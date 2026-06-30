// server/middleware/audit.middleware.js – Audit-log writer
const prisma = require('../prisma/client');

/**
 * Returns middleware that logs changes to audit_log for the given table.
 * Captures the original response body via res.json override.
 *
 * Usage: router.post('/', auditLog('spt_org_cases'), controller.create)
 */
const auditLog = (tableName) => {
  return (req, res, next) => {
    // Only audit mutating methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = async function (body) {
      // Write audit log asynchronously – don't block the response
      try {
        if (req.user) {
          const action =
            req.method === 'POST'
              ? 'CREATE'
              : req.method === 'DELETE'
              ? 'DELETE'
              : 'UPDATE';

          // Try to extract case_id from params, body, or response
          const caseId =
            parseInt(req.params.id, 10) ||
            parseInt(req.params.caseId, 10) ||
            req.body?.case_id ||
            body?.data?.case_id ||
            null;

          await prisma.auditLog.create({
            data: {
              case_id: caseId || null,
              table_name: tableName,
              column_name: null,
              old_value: req.method === 'POST' ? null : JSON.stringify(req.body),
              new_value: JSON.stringify(body?.data || body),
              changed_by: req.user.user_id,
              action,
            },
          });
        }
      } catch (auditErr) {
        console.error('Audit log error:', auditErr.message);
      }

      return originalJson(body);
    };

    next();
  };
};

module.exports = auditLog;
