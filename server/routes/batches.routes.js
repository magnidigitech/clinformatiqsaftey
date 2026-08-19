const express = require('express');
const router = express.Router();
const batchesController = require('../controllers/batches.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', batchesController.getAllBatches);
router.post('/', batchesController.createBatch);
router.put('/:id', batchesController.updateBatch);
router.delete('/:id', batchesController.deleteBatch);

// Batch assignment actions
router.post('/:id/assign', batchesController.assignStudentsToBatch);
router.post('/:id/revoke', batchesController.revokeStudentsFromBatch);

module.exports = router;
