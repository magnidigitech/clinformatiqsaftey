// server/services/meddra.service.js – MedDRA term search
const prisma = require('../prisma/client');

/**
 * Full-text search on pt_name / llt_name using case-insensitive LIKE.
 * Returns up to `limit` matching terms.
 */
async function searchTerms(query, limit = 20) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchPattern = `%${query.trim()}%`;

  // Use raw query for ILIKE (Postgres) – faster for partial matches
  const results = await prisma.$queryRaw`
    SELECT term_id, pt_code, pt_name, llt_code, llt_name,
           hlt_code, hlt_name, hlgt_code, hlgt_name,
           soc_code, soc_name, meddra_version, current_flag
    FROM spt_org_meddra_terms
    WHERE current_flag = 'Y'
      AND (pt_name ILIKE ${searchPattern} OR llt_name ILIKE ${searchPattern})
    ORDER BY pt_name ASC
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Get a single PT by code.
 */
async function getPtByCode(ptCode) {
  return prisma.meddraTerm.findMany({
    where: {
      pt_code: ptCode,
      current_flag: 'Y',
    },
  });
}

/**
 * List distinct SOCs.
 */
async function listSocs() {
  const socs = await prisma.$queryRaw`
    SELECT DISTINCT soc_code, soc_name
    FROM spt_org_meddra_terms
    WHERE current_flag = 'Y' AND soc_code IS NOT NULL
    ORDER BY soc_name ASC
  `;
  return socs;
}

module.exports = {
  searchTerms,
  getPtByCode,
  listSocs,
};
