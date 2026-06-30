const express = require('express');
const router = express.Router({ mergeParams: true });
const meddraController = require('../controllers/meddra.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/search', meddraController.search);
router.get('/pt/:code', meddraController.getPt);
router.get('/soc', meddraController.listSocs);

module.exports = router;
