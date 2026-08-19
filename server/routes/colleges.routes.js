const express = require('express');
const router = express.Router();
const collegesController = require('../controllers/colleges.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', collegesController.getAllColleges);
router.post('/', collegesController.createCollege);
router.put('/:id', collegesController.updateCollege);
router.delete('/:id', collegesController.deleteCollege);

module.exports = router;
