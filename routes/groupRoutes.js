const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createGroup, inviteUser } = require('../controllers/groupController');

router.post('/', authMiddleware, createGroup);
router.post('/:groupId/invite', authMiddleware, inviteUser);

module.exports = router;
