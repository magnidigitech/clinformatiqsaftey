const express = require('express');
const router = express.Router();
const casesController = require('../controllers/cases.controller');
const authMiddleware = require('../middleware/auth.middleware');
const auditMiddleware = require('../middleware/audit.middleware');

router.use(authMiddleware);

router.get('/', casesController.list);
router.post('/', auditMiddleware('spt_org_cases'), casesController.create);
router.get('/:id', casesController.getById);
router.get('/number/:case_number', casesController.getByNumber);
router.get('/:id/revisions', casesController.getRevisions);
router.put('/:id', auditMiddleware('spt_org_cases'), casesController.update);
router.delete('/:id', auditMiddleware('spt_org_cases'), casesController.remove);
router.post('/:id/submit', auditMiddleware('spt_org_cases'), casesController.submit);
router.post('/:id/lock', auditMiddleware('spt_org_cases'), casesController.lock);
router.post('/:id/unlock', auditMiddleware('spt_org_cases'), casesController.unlock);
router.post('/:id/reopen', auditMiddleware('spt_org_cases'), casesController.reopen);
router.post('/:id/route', auditMiddleware('spt_org_cases'), casesController.routeCase);

router.use('/:id/patient', require('./patients.routes'));
router.use('/:id/products', require('./products.routes'));
router.use('/:id/events', require('./events.routes'));
router.use('/:id/workflow', require('./workflow.routes'));
router.use('/:id/feedback', require('./feedback.routes'));
router.use('/:id/action-items', require('./action-items.routes'));
router.use('/:id/reporters', require('./reporters.routes'));

module.exports = router;
