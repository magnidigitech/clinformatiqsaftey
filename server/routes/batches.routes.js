const express = require('express');
const router = express.Router();
const batchesController = require('../controllers/batches.controller');
const authMiddleware = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');

router.use(authMiddleware);

router.get('/', batchesController.getAllBatches);
router.post('/', requireRole('ADMIN'), batchesController.createBatch);
router.put('/:id', requireRole('ADMIN'), batchesController.updateBatch);
router.delete('/:id', requireRole('ADMIN'), batchesController.deleteBatch);

// Batch assignment actions (Admin only)
router.post('/:id/assign', requireRole('ADMIN'), batchesController.assignStudentsToBatch);
router.post('/:id/revoke', requireRole('ADMIN'), batchesController.revokeStudentsFromBatch);

module.exports = router;

