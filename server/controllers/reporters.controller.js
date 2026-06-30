// server/controllers/reporters.controller.js - Reporter upsert
const prisma = require('../prisma/client');
const { validateCaseAccess } = require('../services/case.service');

/**
 * GET /api/cases/:id/reporters
 */
async function get(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    await validateCaseAccess(caseId, req.user);

    const reporters = await prisma.reporter.findMany({
      where: { case_id: caseId },
    });

    res.json({ success: true, data: reporters });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cases/:id/reporters
 * Upsert reporter data for a case. We'll just manage the primary reporter for now.
 */
async function upsert(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    await validateCaseAccess(caseId, req.user);

    const {
      first_name,
      last_name,
      country,
      reporter_type,
      salutation,
      middle_name,
      suffix,
      occupation,
      address,
      institution,
      city,
      state,
      postal_code,
      phone,
      email,
    } = req.body;

    const reporterData = {
      first_name: first_name || null,
      last_name: last_name || null,
      country: country || null,
      reporter_type: reporter_type || null,
    };

    // First check if a reporter exists
    const existing = await prisma.reporter.findFirst({
      where: { case_id: caseId }
    });

    let reporter;
    if (existing) {
      reporter = await prisma.reporter.update({
        where: { reporter_id: existing.reporter_id },
        data: reporterData
      });
    } else {
      reporter = await prisma.reporter.create({
        data: {
          case_id: caseId,
          ...reporterData
        }
      });
    }

    res.json({ success: true, data: reporter });
  } catch (err) {
    next(err);
  }
}

module.exports = { get, upsert };
