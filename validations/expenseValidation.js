const Joi = require('joi');

const participantSchema = Joi.object({
  userId: Joi.string().length(24).hex().required(),
  share: Joi.number().min(0)
});

const addExpenseValidation = Joi.object({
  groupId: Joi.string().length(24).hex().required(),
  description: Joi.string().min(3).max(200).required(),
  amount: Joi.number().positive().required(),
  payer: Joi.string().length(24).hex().required(),
  participants: Joi.array().items(participantSchema).min(1).required(),
  splitType: Joi.string().valid('equal', 'custom').required()
});

module.exports = { addExpenseValidation };