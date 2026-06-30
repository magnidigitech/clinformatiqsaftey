const express = require('express');
const router = express.Router();
const instructorController = require('../controllers/instructor.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

router.use(authMiddleware);
router.use(roleMiddleware('INSTRUCTOR', 'ADMIN'));

router.get('/pending', instructorController.pending);
router.get('/graded', instructorController.graded);
router.get('/stats', instructorController.stats);

module.exports = router;
