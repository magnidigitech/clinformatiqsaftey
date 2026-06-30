const express = require('express');
const router = express.Router({ mergeParams: true });
const workflowController = require('../controllers/workflow.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', workflowController.getHistory);
router.post('/advance', workflowController.advance);

module.exports = router;
