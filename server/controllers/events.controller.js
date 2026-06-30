// server/controllers/events.controller.js – Adverse Event CRUD
const prisma = require('../prisma/client');
const { validateCaseAccess } = require('../services/case.service');

/**
 * GET /api/cases/:id/events
 */
async function list(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    await validateCaseAccess(caseId, req.user);

    const events = await prisma.sptOrgEvent.findMany({
      where: { case_id: caseId },
      include: { causalities: true },
      orderBy: { event_id: 'asc' },
    });

    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cases/:id/events
 * Create event with optional causalities in the request body.
 */
async function create(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    await validateCaseAccess(caseId, req.user);

    const {
      chapter, block, category, entity_title, entity_code, onset_date, end_date,
      severity, outcome, serious_criteria, narrative,
      causalities, // Array of { product_id, causality_who, naranjo_score, naranjo_detail }
    } = req.body;

    const event = await prisma.sptOrgEvent.create({
      data: {
        case_id: caseId,
        chapter: chapter || null,
        block: block || null,
        category: category || null,
        entity_title: entity_title || null,
        entity_code: entity_code || null,
        onset_date: onset_date ? new Date(onset_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        severity: severity || null,
        outcome: outcome || null,
        serious_criteria: serious_criteria || null,
        narrative: narrative || null,
        causalities: causalities && causalities.length > 0
          ? {
              create: causalities.map((c) => ({
                product_id: c.product_id,
                causality_who: c.causality_who || null,
                causality_reported: c.causality_reported || null,
                causality_determined: c.causality_determined || null,
                seriousness: c.seriousness || null,
                listedness_data: c.listedness_data || null,
                naranjo_score: (c.naranjo_score !== null && c.naranjo_score !== undefined && c.naranjo_score !== '') ? parseInt(c.naranjo_score, 10) : null,
                naranjo_detail: c.naranjo_detail || null,
              })),
            }
          : undefined,
      },
      include: { causalities: true },
    });

    res.status(201).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/cases/:id/events/:eventId
 */
async function update(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    const eventId = parseInt(req.params.eventId, 10);
    await validateCaseAccess(caseId, req.user);

    // Verify event belongs to case
    const existing = await prisma.sptOrgEvent.findFirst({
      where: { event_id: eventId, case_id: caseId },
    });

    if (!existing) {
      const err = new Error('Event not found for this case');
      err.statusCode = 404;
      throw err;
    }

    const {
      chapter, block, category, entity_title, entity_code, onset_date, end_date,
      severity, outcome, serious_criteria, narrative,
      causalities,
    } = req.body;

    // If causalities provided, replace them (delete + recreate)
    if (causalities !== undefined) {
      await prisma.sptOrgEventCausality.deleteMany({
        where: { event_id: eventId },
      });

      if (causalities && causalities.length > 0) {
        await prisma.sptOrgEventCausality.createMany({
          data: causalities.map((c) => ({
            event_id: eventId,
            product_id: c.product_id,
            causality_who: c.causality_who || null,
            causality_reported: c.causality_reported || null,
            causality_determined: c.causality_determined || null,
            seriousness: c.seriousness || null,
            listedness_data: c.listedness_data || null,
            naranjo_score: (c.naranjo_score !== null && c.naranjo_score !== undefined && c.naranjo_score !== '') ? parseInt(c.naranjo_score, 10) : null,
            naranjo_detail: c.naranjo_detail || null,
          })),
        });
      }
    }

    const event = await prisma.sptOrgEvent.update({
      where: { event_id: eventId },
      data: {
        chapter: chapter !== undefined ? chapter : undefined,
        block: block !== undefined ? block : undefined,
        category: category !== undefined ? category : undefined,
        entity_title: entity_title !== undefined ? entity_title : undefined,
        entity_code: entity_code !== undefined ? entity_code : undefined,
        onset_date: onset_date !== undefined ? (onset_date ? new Date(onset_date) : null) : undefined,
        end_date: end_date !== undefined ? (end_date ? new Date(end_date) : null) : undefined,
        severity: severity !== undefined ? severity : undefined,
        outcome: outcome !== undefined ? outcome : undefined,
        serious_criteria: serious_criteria !== undefined ? serious_criteria : undefined,
        narrative: narrative !== undefined ? narrative : undefined,
      },
      include: { causalities: true },
    });

    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/cases/:id/events/:eventId
 */
async function remove(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    const eventId = parseInt(req.params.eventId, 10);
    await validateCaseAccess(caseId, req.user);

    const existing = await prisma.sptOrgEvent.findFirst({
      where: { event_id: eventId, case_id: caseId },
    });

    if (!existing) {
      const err = new Error('Event not found for this case');
      err.statusCode = 404;
      throw err;
    }

    // Delete causalities first
    await prisma.sptOrgEventCausality.deleteMany({
      where: { event_id: eventId },
    });

    await prisma.sptOrgEvent.delete({
      where: { event_id: eventId },
    });

    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
