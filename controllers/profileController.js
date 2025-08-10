const User = require('../models/User');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');

const toNumber2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1) Basic user info
    const user = await User.findById(userId).select('-password').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 2) Groups the user is a member of
    const groups = await Group.find({ 'members.userId': userId }).lean();
    const groupIds = groups.map(g => g._id);

    // 3) All expenses in those groups
    const allExpenses = await Expense.find({ groupId: { $in: groupIds } })
      .populate('payer', 'name email')
      .lean();

    // 4) Build group -> expenses map (only include expenses where user is participant or payer)
    const groupMap = {};
    groups.forEach(g => {
      groupMap[g._id.toString()] = {
        groupId: g._id,
        name: g.name,
        description: g.description || '',
        yourExpenses: []
      };
    });

    let totalPaid = 0;
    let totalOwe = 0;

    for (const exp of allExpenses) {
      const gId = exp.groupId.toString();
      const participant = (exp.participants || []).find(p => p.userId.toString() === userId);
      const isPayer = exp.payer && exp.payer._id && exp.payer._id.toString() === userId;

      if (!participant && !isPayer) continue;

      const yourShare = participant ? Number(participant.share || 0) : 0;
      const youPaid = isPayer ? Number(exp.amount || 0) : 0;
      const netEffect = toNumber2(youPaid - yourShare);

      totalPaid += youPaid;
      totalOwe += yourShare;

      groupMap[gId].yourExpenses.push({
        expenseId: exp._id,
        description: exp.description,
        amount: toNumber2(exp.amount),
        date: exp.date,
        payer: {
          id: exp.payer ? exp.payer._id : null,
          name: exp.payer ? exp.payer.name : null,
          email: exp.payer ? exp.payer.email : null
        },
        yourShare: toNumber2(yourShare),
        youPaid: toNumber2(youPaid),
        netEffect
      });
    }

    // 5) Settlement history involving the user (in user's groups)
    const settlements = await Settlement.find({
      groupId: { $in: groupIds },
      $or: [{ fromUserId: userId }, { toUserId: userId }]
    })
      .populate('fromUserId', 'name email')
      .populate('toUserId', 'name email')
      .lean();

    const settlementList = settlements.map(s => ({
      id: s._id,
      groupId: s.groupId,
      from: {
        id: s.fromUserId._id,
        name: s.fromUserId.name,
        email: s.fromUserId.email
      },
      to: {
        id: s.toUserId._id,
        name: s.toUserId.name,
        email: s.toUserId.email
      },
      amount: toNumber2(s.amount),
      date: s.settledAt || s.createdAt
    }));

    const groupsResult = Object.values(groupMap).map(g => ({
      groupId: g.groupId,
      name: g.name,
      description: g.description,
      expenses: g.yourExpenses
    }));

    const totals = {
      totalPaid: toNumber2(totalPaid),
      totalOwe: toNumber2(totalOwe),
      netBalance: toNumber2(totalPaid - totalOwe)
    };

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      totals,
      groups: groupsResult,
      settlements: settlementList
    });
  } catch (err) {
    next(err);
  }
};
