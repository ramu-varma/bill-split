const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { addExpense } = require('../controllers/expenseController');

router.post('/', authMiddleware, addExpense);

module.exports = router;