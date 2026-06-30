// server/controllers/patients.controller.js – Patient (CAD) upsert
const prisma = require('../prisma/client');
const { validateCaseAccess } = require('../services/case.service');

/**
 * GET /api/cases/:id/patient
 */
async function get(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    await validateCaseAccess(caseId, req.user);

    const patient = await prisma.sptOrgCad.findUnique({
      where: { case_id: caseId },
    });

    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cases/:id/patient
 * Upsert patient data for a case.
 */
async function upsert(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    await validateCaseAccess(caseId, req.user);

    const {
      patient_code,
      dob,
      age_value,
      age_unit,
      sex,
      weight_kg,
      height_cm,
      ethnicity,
      medical_history,
      concomitant_meds,
    } = req.body;

    const patientData = {
      patient_code: patient_code || null,
      dob: dob ? new Date(dob) : null,
      age_value: (age_value !== null && age_value !== '') ? parseInt(age_value, 10) : null,
      age_unit: age_unit || null,
      sex: sex || null,
      weight_kg: (weight_kg !== null && weight_kg !== '') ? parseInt(weight_kg, 10) : null,
      height_cm: (height_cm !== null && height_cm !== '') ? parseInt(height_cm, 10) : null,
      ethnicity: ethnicity || null,
      medical_history: medical_history || null,
      concomitant_meds: concomitant_meds || null,
    };

    const patient = await prisma.sptOrgCad.upsert({
      where: { case_id: caseId },
      create: { case_id: caseId, ...patientData },
      update: patientData,
    });

    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
}

module.exports = { get, upsert };
