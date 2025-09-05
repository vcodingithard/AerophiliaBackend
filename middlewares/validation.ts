import { body, param, validationResult } from 'express-validator';
import type{ Request, Response, NextFunction } from 'express';


const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validation rules for the "Create Team Registration" endpoint
export const validateTeamCreation = [
  param('eventId')
    .isString().withMessage('Event ID must be a string.')
    .trim()
    .notEmpty().withMessage('Event ID cannot be empty.'),
  body('teamName')
    .isString().withMessage('Team name must be a string.')
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Team name must be between 3 and 50 characters.'),
  body('members')
    .isArray({ min: 1 }).withMessage('Members must be an array with at least one email.'),
  body('members.*')
    .isEmail().withMessage('Each member must be a valid email address.'),
  handleValidationErrors,
];

// Validation rules for routes that accept or reject a request
export const validateRequestAction = [
  param('id')
    .isString().withMessage('Request ID must be a string.')
    .trim()
    .notEmpty().withMessage('Request ID is required.'),
  handleValidationErrors,
];

// Generic validation for any route requiring an eventId in the URL parameters
export const validateEventIdParam = [
  param('eventId')
    .isString().withMessage('Event ID must be a string.')
    .trim()
    .notEmpty().withMessage('Event ID is required.'),
  handleValidationErrors,
];
