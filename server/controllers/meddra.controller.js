// server/controllers/meddra.controller.js – MedDRA term endpoints
const meddraService = require('../services/meddra.service');

/**
 * GET /api/meddra/search?q=&limit=20
 */
async function search(req, res, next) {
  try {
    const { q, limit } = req.query;
    const maxLimit = Math.min(parseInt(limit, 10) || 20, 100);

    const results = await meddraService.searchTerms(q, maxLimit);

    res.json({ success: true, data: results, count: results.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/meddra/pt/:code
 */
async function getPt(req, res, next) {
  try {
    const { code } = req.params;
    const terms = await meddraService.getPtByCode(code);

    if (!terms || terms.length === 0) {
      const err = new Error(`No MedDRA term found for PT code: ${code}`);
      err.statusCode = 404;
      throw err;
    }

    res.json({ success: true, data: terms });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/meddra/soc
 */
async function listSocs(req, res, next) {
  try {
    const socs = await meddraService.listSocs();
    res.json({ success: true, data: socs });
  } catch (err) {
    next(err);
  }
}

module.exports = { search, getPt, listSocs };
