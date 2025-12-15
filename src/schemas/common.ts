// Common Zod schemas for input validation

import { z } from 'zod';
import { ResponseFormat } from '../constants.js';

export const ResponseFormatSchema = z.nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'json' for structured data or 'markdown' for human-readable text");

export const PaginationSchema = {
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of results to return (1-100)'),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe('Number of results to skip for pagination')
};

export const EmployeeIdSchema = z.string()
  .describe('Employee ID (use 0 for directory, or specific employee ID)');

export const FieldsSchema = z.array(z.string())
  .optional()
  .describe('Array of field names to retrieve (e.g., ["firstName", "lastName", "email"])');

export const DateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .describe('Date in YYYY-MM-DD format');

export const OnlyCurrentSchema = z.boolean()
  .optional()
  .describe('If true, only return current values (excludes historical data)');
