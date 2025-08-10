const Joi = require('joi');

const createGroupValidation = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  description: Joi.string().allow('').max(200),

  members: Joi.array().items(Joi.string().required()).min(1)
});

const inviteUserValidation = Joi.object({
  email: Joi.string().email().required()
});

module.exports = { createGroupValidation, inviteUserValidation };