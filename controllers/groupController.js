const Group = require('../models/Group');
const User = require('../models/User');
const sendEmail = require('../utils/emailService');
const { createGroupValidation, inviteUserValidation } = require('../validations/groupValidation');

exports.createGroup = async (req, res, next) => {
  try {
    const { error } = createGroupValidation.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { name, description } = req.body;
    const userId = req.user.id;

    const existingGroup = await Group.findOne({ name });
    if (existingGroup) return res.status(409).json({ error: 'Group name already exists' });

    const group = new Group({
      name,
      description,
      members: [{ userId, role: 'admin' }],
      createdBy: userId
    });

    await group.save();
    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
};

exports.inviteUser = async (req, res, next) => {
  try {
    const { error } = inviteUserValidation.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { groupId } = req.params;
    const { email } = req.body;
    const inviterId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const inviter = group.members.find(m => m.userId.toString() === inviterId);
    if (!inviter || inviter.role !== 'admin')
      return res.status(403).json({ error: 'Only admins can invite users' });

    const userToInvite = await User.findOne({ email });
    if (!userToInvite) return res.status(404).json({ error: 'User not found' });

    const alreadyMember = group.members.some(m => m.userId.toString() === userToInvite._id.toString());
    if (alreadyMember) return res.status(400).json({ error: 'User already a group member' });

    group.members.push({ userId: userToInvite._id, role: 'member' });
    await group.save();

    const inviterUser = await User.findById(inviterId);
    const subject = `You've been invited to join group "${group.name}"`;
    const html = `
      <p>Hello ${userToInvite.name},</p>
      <p>You have been invited by ${inviterUser.name} to join the group <strong>${group.name}</strong>.</p>
      <p>Login to your account to view and participate.</p>
    `;
    await sendEmail(userToInvite.email, subject, html);

    res.json({ message: `Invitation sent to ${email}` });
  } catch (err) {
    next(err);
  }
};
