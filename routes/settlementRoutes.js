const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { recordSettlement } = require('../controllers/settlementController');

router.post('/', authMiddleware, recordSettlement);

module.exports = router;