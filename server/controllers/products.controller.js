// server/controllers/products.controller.js – Product/Drug CRUD
const prisma = require('../prisma/client');
const { validateCaseAccess } = require('../services/case.service');

/**
 * GET /api/cases/:id/products
 */
async function list(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    await validateCaseAccess(caseId, req.user);

    const products = await prisma.sptOrgProduct.findMany({
      where: { case_id: caseId },
      include: { dosage: true },
      orderBy: { product_id: 'asc' },
    });

    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cases/:id/products
 */
async function create(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    await validateCaseAccess(caseId, req.user);

    const {
      drug_name, dose, dose_unit, route, frequency,
      start_date, stop_date, suspect_flag, batch_number,
      indication, action_taken, dechallenge, rechallenge,
    } = req.body;

    if (!drug_name) {
      const err = new Error('drug_name is required');
      err.statusCode = 400;
      throw err;
    }

    const product = await prisma.sptOrgProduct.create({
      data: {
        case_id: caseId,
        drug_name,
        dose: dose || null,
        dose_unit: dose_unit || null,
        route: route || null,
        frequency: frequency || null,
        start_date: start_date ? new Date(start_date) : null,
        stop_date: stop_date ? new Date(stop_date) : null,
        suspect_flag: suspect_flag || 'SUSPECT',
        batch_number: batch_number || null,
        indication: indication || null,
        action_taken: action_taken || null,
        dechallenge: dechallenge || null,
        rechallenge: rechallenge || null,
      },
    });

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/cases/:id/products/:productId
 */
async function update(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    const productId = parseInt(req.params.productId, 10);
    await validateCaseAccess(caseId, req.user);

    // Verify product belongs to case
    const existing = await prisma.sptOrgProduct.findFirst({
      where: { product_id: productId, case_id: caseId },
    });

    if (!existing) {
      const err = new Error('Product not found for this case');
      err.statusCode = 404;
      throw err;
    }

    const {
      drug_name, dose, dose_unit, route, frequency,
      start_date, stop_date, suspect_flag, batch_number,
      indication, action_taken, dechallenge, rechallenge,
    } = req.body;

    const product = await prisma.sptOrgProduct.update({
      where: { product_id: productId },
      data: {
        drug_name: drug_name !== undefined ? drug_name : undefined,
        dose: dose !== undefined ? dose : undefined,
        dose_unit: dose_unit !== undefined ? dose_unit : undefined,
        route: route !== undefined ? route : undefined,
        frequency: frequency !== undefined ? frequency : undefined,
        start_date: start_date !== undefined ? (start_date ? new Date(start_date) : null) : undefined,
        stop_date: stop_date !== undefined ? (stop_date ? new Date(stop_date) : null) : undefined,
        suspect_flag: suspect_flag !== undefined ? suspect_flag : undefined,
        batch_number: batch_number !== undefined ? batch_number : undefined,
        indication: indication !== undefined ? indication : undefined,
        action_taken: action_taken !== undefined ? action_taken : undefined,
        dechallenge: dechallenge !== undefined ? dechallenge : undefined,
        rechallenge: rechallenge !== undefined ? rechallenge : undefined,
      },
    });

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/cases/:id/products/:productId
 */
async function remove(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    const productId = parseInt(req.params.productId, 10);
    await validateCaseAccess(caseId, req.user);

    const existing = await prisma.sptOrgProduct.findFirst({
      where: { product_id: productId, case_id: caseId },
    });

    if (!existing) {
      const err = new Error('Product not found for this case');
      err.statusCode = 404;
      throw err;
    }

    // Delete related dosage regimens first
    await prisma.sptOrgDosageRegimen.deleteMany({
      where: { product_id: productId },
    });

    // Delete causalities referencing this product
    await prisma.sptOrgEventCausality.deleteMany({
      where: { product_id: productId },
    });

    await prisma.sptOrgProduct.delete({
      where: { product_id: productId },
    });

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
