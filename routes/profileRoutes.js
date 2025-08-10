const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getProfile } = require('../controllers/profileController');

router.get('/', authMiddleware, getProfile);

module.exports = router;