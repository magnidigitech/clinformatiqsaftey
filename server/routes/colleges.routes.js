const express = require('express');
const router = express.Router();
const collegesController = require('../controllers/colleges.controller');
const authMiddleware = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');

router.use(authMiddleware);

router.get('/', collegesController.getAllColleges);
router.post('/', requireRole('ADMIN'), collegesController.createCollege);
router.put('/:id', requireRole('ADMIN'), collegesController.updateCollege);
router.delete('/:id', requireRole('ADMIN'), collegesController.deleteCollege);

module.exports = router;

