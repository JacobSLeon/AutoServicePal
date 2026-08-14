'use strict';

/**
 * src/middlewares/validate.js
 *
 * Generic Joi validation middleware factory.
 * Validates req.body against the provided Joi schema.
 * Returns HTTP 400 with detailed error messages on validation failure.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), authController.register);
 */

const Joi = require('joi');

/**
 * PASSWORD_REGEX enforces the spec rules:
 *   - Minimum 8 characters
 *   - At least 1 uppercase letter
 *   - At least 1 number
 */
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * Shared Joi schemas for auth endpoints.
 * Exported so tests can import and exercise them directly.
 */
const schemas = {
  register: Joi.object({
    full_name_v5: Joi.string().min(2).max(255).required().messages({
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name must not exceed 255 characters',
      'any.required': 'Full name (as on V5) is required',
    }),
    email: Joi.string().email().max(255).required().messages({
      'string.email': 'A valid email address is required',
      'any.required': 'Email is required',
    }),
    password: Joi.string().pattern(PASSWORD_REGEX).required().messages({
      'string.pattern.base':
        'Password must be at least 8 characters and include at least 1 uppercase letter and 1 number',
      'any.required': 'Password is required',
    }),
    password_confirmation: Joi.any()
      .equal(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Password confirmation does not match password',
        'any.required': 'Password confirmation is required',
      }),
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'A valid email address is required',
      'any.required': 'Email is required',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'A valid email address is required',
      'any.required': 'Email is required',
    }),
  }),

  reviewV5: Joi.object({
    status: Joi.string().valid('APPROVED', 'REJECTED').required(),
    rejection_reason: Joi.string().max(1000).when('status', {
      is: 'REJECTED',
      then: Joi.required(),
      otherwise: Joi.optional().allow(null, '')
    })
  }),

  verifyWorkItem: Joi.object({
    status: Joi.string().valid('APPROVED', 'REJECTED').required(),
    admin_note: Joi.string().max(1000).optional().allow(null, '')
  }),

  serviceRecord: Joi.object({
    vehicle_id: Joi.string().required(),
    service_type: Joi.string().required(),
    service_date: Joi.date().iso().required().messages({
      'date.format': 'Service date must be a valid ISO date string (YYYY-MM-DD)'
    }),
    record_name: Joi.string().optional().allow(null, ''),
    cost: Joi.number().optional().allow(null),
    provider_details: Joi.string().optional().allow(null, ''),
    work_items: Joi.array().items(
      Joi.object({
        item_key: Joi.string().required(),
        custom_description: Joi.string().when('item_key', {
          is: 'Other',
          then: Joi.required(),
          otherwise: Joi.optional().allow(null, '')
        })
      })
    ).required()
  }),

  updateServiceRecord: Joi.object({
    service_type: Joi.string().optional(),
    service_date: Joi.date().iso().optional().messages({
      'date.format': 'Service date must be a valid ISO date string (YYYY-MM-DD)'
    }),
    record_name: Joi.string().optional().allow(null, ''),
    cost: Joi.number().optional().allow(null),
    provider_details: Joi.string().optional().allow(null, ''),
    work_items: Joi.array().items(
      Joi.object({
        item_key: Joi.string().required(),
        custom_description: Joi.string().when('item_key', {
          is: 'Other',
          then: Joi.required(),
          otherwise: Joi.optional().allow(null, '')
        })
      })
    ).optional()
  }),
};

/**
 * Middleware factory — validates req.body against the given Joi schema.
 *
 * @param {Joi.Schema} schema - The Joi schema to validate against
 * @returns {Function} Express middleware
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,   // Return ALL validation errors, not just the first
      stripUnknown: true,  // Remove any fields not in the schema
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));

      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors,
      });
    }

    // Replace req.body with the validated + sanitised value
    req.body = value;
    return next();
  };
}

module.exports = { validate, schemas, PASSWORD_REGEX };
