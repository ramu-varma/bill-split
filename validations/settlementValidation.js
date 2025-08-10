const Joi = require('joi');

const recordSettlementValidation = Joi.object({
  groupId: Joi.string().length(24).hex().required(),
  fromUserId: Joi.string().length(24).hex().required(),
  toUserId: Joi.string().length(24).hex().required(),
  amount: Joi.number().positive().required()
});

module.exports = { recordSettlementValidation };