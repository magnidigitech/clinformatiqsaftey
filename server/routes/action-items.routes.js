const express = require('express');
const router = express.Router({ mergeParams: true });
const actionItemsController = require('../controllers/action-items.controller');
const auditMiddleware = require('../middleware/audit.middleware');

router.get('/', actionItemsController.list);
router.post('/', auditMiddleware('spt_org_case_action_items'), actionItemsController.create);
router.put('/:actionId', auditMiddleware('spt_org_case_action_items'), actionItemsController.update);
router.delete('/:actionId', auditMiddleware('spt_org_case_action_items'), actionItemsController.remove);

module.exports = router;
