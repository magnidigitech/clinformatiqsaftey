const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const authMiddleware = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');

router.use(authMiddleware);

router.get('/org', usersController.getOrgUsers);
router.get('/', requireRole('ADMIN'), usersController.getAllUsers);
router.post('/', requireRole('ADMIN'), usersController.createUser);
router.post('/bulk', requireRole('ADMIN'), usersController.bulkCreateUsers);
router.post('/bulk-assign-batch', requireRole('ADMIN'), usersController.bulkAssignBatch);
router.post('/bulk-revoke-batch', requireRole('ADMIN'), usersController.bulkRevokeBatch);
router.post('/bulk-delete', requireRole('ADMIN'), usersController.bulkDeleteUsers);
router.put('/:id', requireRole('ADMIN'), usersController.updateUser);
router.delete('/:id', requireRole('ADMIN'), usersController.deleteUser);

// Sessions management (Admin only)
router.get('/sessions', requireRole('ADMIN'), usersController.getActiveSessions);
router.post('/sessions/bulk-revoke', requireRole('ADMIN'), usersController.bulkRevokeSessions);
router.delete('/sessions/:id', requireRole('ADMIN'), usersController.revokeSession);
router.delete('/sessions/user/:userId', requireRole('ADMIN'), usersController.revokeUserSessions);

module.exports = router;

