const express = require('express');
const router = express.Router({ mergeParams: true });
const reportersController = require('../controllers/reporters.controller');
const authMiddleware = require('../middleware/auth.middleware');
const auditMiddleware = require('../middleware/audit.middleware');

router.use(authMiddleware);

router.get('/', reportersController.get);
router.post('/', auditMiddleware('spt_org_contact_log'), reportersController.upsert);

module.exports = router;
