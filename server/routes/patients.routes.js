const express = require('express');
const router = express.Router({ mergeParams: true });
const patientsController = require('../controllers/patients.controller');
const authMiddleware = require('../middleware/auth.middleware');
const auditMiddleware = require('../middleware/audit.middleware');

router.use(authMiddleware);

router.get('/', patientsController.get);
router.post('/', auditMiddleware('spt_org_cad'), patientsController.upsert);

module.exports = router;
