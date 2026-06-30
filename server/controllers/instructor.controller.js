// server/controllers/instructor.controller.js – Instructor dashboard endpoints
const prisma = require('../prisma/client');

/**
 * GET /api/instructor/pending
 * Cases with workflow_state=SUBMITTED in the instructor's org.
 */
async function pending(req, res, next) {
  try {
    const cases = await prisma.sptOrgCase.findMany({
      where: {
        org_id: req.user.org_id,
        workflow_state: 'SUBMITTED',
      },
      orderBy: { updated_at: 'desc' },
      include: {
        student: {
          select: { user_id: true, username: true, full_name: true },
        },
        patient: true,
        _count: {
          select: { products: true, events: true },
        },
      },
    });

    res.json({ success: true, data: cases });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/instructor/graded
 * Cases with instructor feedback in the instructor's org.
 */
async function graded(req, res, next) {
  try {
    const cases = await prisma.sptOrgCase.findMany({
      where: {
        org_id: req.user.org_id,
        feedback: { some: {} },
      },
      orderBy: { updated_at: 'desc' },
      include: {
        student: {
          select: { user_id: true, username: true, full_name: true },
        },
        feedback: {
          orderBy: { created_at: 'desc' },
          include: {
            instructor: {
              select: { user_id: true, username: true, full_name: true },
            },
          },
        },
      },
    });

    res.json({ success: true, data: cases });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/instructor/stats
 * Aggregate stats: total cases, avg score, state distribution.
 */
async function stats(req, res, next) {
  try {
    const orgId = req.user.org_id;

    // Total cases in org
    const totalCases = await prisma.sptOrgCase.count({
      where: { org_id: orgId },
    });

    // State distribution
    const stateDistribution = await prisma.sptOrgCase.groupBy({
      by: ['workflow_state'],
      where: { org_id: orgId },
      _count: { case_id: true },
    });

    // Average score
    const avgScore = await prisma.instructorFeedback.aggregate({
      where: {
        case: { org_id: orgId },
        score: { not: null },
      },
      _avg: { score: true },
      _count: { feedback_id: true },
    });

    // Recent submissions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSubmissions = await prisma.sptOrgCase.count({
      where: {
        org_id: orgId,
        workflow_state: { in: ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED'] },
        updated_at: { gte: thirtyDaysAgo },
      },
    });

    // Format state distribution
    const states = {};
    stateDistribution.forEach((s) => {
      states[s.workflow_state] = s._count.case_id;
    });

    res.json({
      success: true,
      data: {
        total_cases: totalCases,
        average_score: avgScore._avg.score
          ? Math.round(avgScore._avg.score * 100) / 100
          : null,
        total_graded: avgScore._count.feedback_id,
        recent_submissions: recentSubmissions,
        state_distribution: states,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { pending, graded, stats };
