const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/org', usersController.getOrgUsers);
router.get('/', usersController.getAllUsers);
router.post('/', usersController.createUser);
router.post('/bulk', usersController.bulkCreateUsers);
router.post('/bulk-assign-batch', usersController.bulkAssignBatch);
router.post('/bulk-revoke-batch', usersController.bulkRevokeBatch);
router.post('/bulk-delete', usersController.bulkDeleteUsers);
router.put('/:id', usersController.updateUser);
router.delete('/:id', usersController.deleteUser);

// Sessions management
router.get('/sessions', usersController.getActiveSessions);
router.post('/sessions/bulk-revoke', usersController.bulkRevokeSessions);
router.delete('/sessions/:id', usersController.revokeSession);
router.delete('/sessions/user/:userId', usersController.revokeUserSessions);

module.exports = router;
