const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const User = require('../models/User');
const sendEmail = require('../utils/emailService');
const { recordSettlementValidation } = require('../validations/settlementValidation');

exports.recordSettlement = async (req, res, next) => {
  try {
    const { error } = recordSettlementValidation.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { groupId, fromUserId, toUserId, amount } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (
      !group.members.some(m => m.userId.toString() === fromUserId) ||
      !group.members.some(m => m.userId.toString() === toUserId)
    )
      return res.status(400).json({ error: 'Both users must be group members' });

    if (amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });

    const settlement = new Settlement({ groupId, fromUserId, toUserId, amount, settledAt: new Date() });
    await settlement.save();

    const fromUser = await User.findById(fromUserId);
    const toUser = await User.findById(toUserId);
    const groupName = group.name;

    const subject = `Bill Settlement Recorded in Group "${groupName}"`;
    const html = `
      <p>Hello,</p>
      <p>A settlement has been recorded in your group <strong>${groupName}</strong>:</p>
      <ul>
        <li>From: ${fromUser.name} (${fromUser.email})</li>
        <li>To: ${toUser.name} (${toUser.email})</li>
        <li>Amount: ₹${amount}</li>
      </ul>
      <p>Please check your app for details.</p>
    `;

    await Promise.all([
      sendEmail(fromUser.email, subject, html),
      sendEmail(toUser.email, subject, html)
    ]);

    res.status(201).json(settlement);
  } catch (err) {
    next(err);
  }
};

