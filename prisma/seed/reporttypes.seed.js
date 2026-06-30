// ─── PharmaVigil – Report Types Seed ─────────────────────────────────────────
// Upserts the six standard pharmacovigilance report types into the
// spt_org_report_types table.  Safe to run multiple times (idempotent).
// ──────────────────────────────────────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const REPORT_TYPES = [
  {
    code: 'EXPEDITED_15DAY',
    label: '15-day Expedited Report (serious unexpected)',
    deadline_days: 15,
    agency: 'FDA/EMA',
  },
  {
    code: 'EXPEDITED_7DAY',
    label: '7-day Fatal/Life-threatening Report',
    deadline_days: 7,
    agency: 'FDA',
  },
  {
    code: 'PERIODIC_PSUR',
    label: 'Periodic Safety Update Report (PSUR)',
    deadline_days: null,
    agency: 'EMA',
  },
  {
    code: 'PERIODIC_PBRER',
    label: 'Periodic Benefit-Risk Evaluation Report (PBRER)',
    deadline_days: null,
    agency: 'ICH',
  },
  {
    code: 'SPONTANEOUS',
    label: 'Spontaneous Report',
    deadline_days: null,
    agency: null,
  },
  {
    code: 'STUDY',
    label: 'Study Report (clinical trial)',
    deadline_days: null,
    agency: null,
  },
]

/**
 * Load / update the standard report types.
 * @returns {Promise<number>} Number of report types upserted
 */
async function loadReportTypes () {
  let count = 0

  for (const rt of REPORT_TYPES) {
    await prisma.reportType.upsert({
      where: { code: rt.code },
      update: {
        label: rt.label,
        deadline_days: rt.deadline_days,
        agency: rt.agency,
      },
      create: {
        code: rt.code,
        label: rt.label,
        deadline_days: rt.deadline_days,
        agency: rt.agency,
      },
    })
    count++
  }

  return count
}

module.exports = { loadReportTypes }
