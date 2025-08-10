const Expense = require('../models/Expense');
const Group = require('../models/Group');
const User = require('../models/User');
const sendEmail = require('../utils/emailService');
const { addExpenseValidation } = require('../validations/expenseValidation');

exports.addExpense = async (req, res, next) => {
  try {
    const { error } = addExpenseValidation.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { groupId, description, amount, payer, participants, splitType } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (!group.members.some(m => m.userId.toString() === payer))
      return res.status(400).json({ error: 'Payer must be a group member' });

    for (const p of participants) {
      if (!group.members.some(m => m.userId.toString() === p.userId))
        return res.status(400).json({ error: 'All participants must be group members' });
    }

    if (splitType === 'custom') {
      const totalShares = participants.reduce((sum, p) => sum + (p.share || 0), 0);
      if (Math.abs(totalShares - amount) > 0.01)
        return res.status(400).json({ error: 'Sum of shares must equal total amount' });
    } else if (splitType === 'equal') {
      const equalShare = +(amount / participants.length).toFixed(2);
      participants.forEach(p => (p.share = equalShare));
    }

    const expense = new Expense({ groupId, description, amount, payer, participants, date: new Date() });
    await expense.save();

    const users = await User.find({ _id: { $in: participants.map(p => p.userId) } });
    const payerUser = await User.findById(payer);

    const emails = users.filter(u => u._id.toString() !== payer).map(u => u.email);

    const subject = `New Expense Added in Group "${group.name}"`;
    const html = `
      <p>Hi,</p>
      <p>A new expense has been added to your group <strong>${group.name}</strong>:</p>
      <ul>
        <li>Description: ${description}</li>
        <li>Amount: ₹${amount}</li>
        <li>Payer: ${payerUser.name} (${payerUser.email})</li>
      </ul>
      <p>Please check your app for details.</p>
    `;

    await Promise.all(emails.map(email => sendEmail(email, subject, html)));

    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
};

