const express = require('express');
const router = express.Router({ mergeParams: true });
const feedbackController = require('../controllers/feedback.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

router.use(authMiddleware);

router.post('/', roleMiddleware('INSTRUCTOR', 'ADMIN'), feedbackController.create);

module.exports = router;
