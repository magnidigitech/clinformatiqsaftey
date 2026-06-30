const express = require('express');
const router = express.Router({ mergeParams: true });
const eventsController = require('../controllers/events.controller');
const authMiddleware = require('../middleware/auth.middleware');
const auditMiddleware = require('../middleware/audit.middleware');

router.use(authMiddleware);

router.get('/', eventsController.list);
router.post('/', auditMiddleware('spt_org_event'), eventsController.create);
router.put('/:eventId', auditMiddleware('spt_org_event'), eventsController.update);
router.delete('/:eventId', auditMiddleware('spt_org_event'), eventsController.remove);

module.exports = router;
