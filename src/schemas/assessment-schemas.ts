// Assessment and Certification Zod schemas for input validation

import { z } from 'zod';
import { ResponseFormatSchema, EmployeeIdSchema, DateSchema } from './common.js';

// Certification status enum
export const CertificationStatusSchema = z.enum(['active', 'expiring_soon', 'expired', 'not_started', 'all'])
  .describe("Filter by certification status: 'active', 'expiring_soon', 'expired', 'not_started', or 'all'");

// Certification category enum
export const CertificationCategorySchema = z.enum(['azure', 'data', 'power-platform', 'aws', 'other', 'all'])
  .describe("Filter by certification category: 'azure', 'data', 'power-platform', 'aws', 'other', or 'all'");

// Assessment type enum
export const AssessmentTypeSchema = z.enum(['certification', 'training', 'goal'])
  .describe("Type of assessment: 'certification', 'training', or 'goal'");

// Schema for getting certifications due
export const GetCertificationsDueSchema = z.object({
  due_before: DateSchema.optional()
    .describe('Filter certifications due before this date (YYYY-MM-DD)'),
  due_after: DateSchema.optional()
    .describe('Filter certifications due after this date (YYYY-MM-DD)'),
  expires_before: DateSchema.optional()
    .describe('Filter certifications expiring before this date (YYYY-MM-DD)'),
  expires_after: DateSchema.optional()
    .describe('Filter certifications expiring after this date (YYYY-MM-DD)'),
  certification_code: z.string().optional()
    .describe('Filter by specific certification code (e.g., "AZ-104", "DP-203")'),
  category: CertificationCategorySchema.optional().default('all'),
  status: CertificationStatusSchema.optional().default('all'),
  employee_id: EmployeeIdSchema.optional()
    .describe('Filter by specific employee ID'),
  response_format: ResponseFormatSchema
});

// Schema for employee certification summary
export const GetEmployeeCertificationSummarySchema = z.object({
  employee_id: EmployeeIdSchema
    .describe('Employee ID to get certification summary for'),
  category: CertificationCategorySchema.optional().default('all'),
  include_not_started: z.boolean().optional().default(false)
    .describe('Include certifications the employee has not started'),
  response_format: ResponseFormatSchema
});

// Schema for company certifications report
export const GetCompanyCertificationsReportSchema = z.object({
  category: CertificationCategorySchema.optional().default('all'),
  group_by: z.enum(['category', 'department', 'certification', 'status']).optional().default('category')
    .describe('How to group the report results'),
  include_compliance_rate: z.boolean().optional().default(true)
    .describe('Include compliance rate calculations'),
  response_format: ResponseFormatSchema
});

// Schema for employees with assessments due
export const GetEmployeesWithAssessmentsDueSchema = z.object({
  start_date: DateSchema.optional()
    .describe('Start of date range for due items'),
  end_date: DateSchema.optional()
    .describe('End of date range for due items'),
  assessment_types: z.array(AssessmentTypeSchema).optional()
    .describe("Types of assessments to include (default: all types)"),
  include_overdue: z.boolean().optional().default(true)
    .describe('Include items that are already overdue'),
  employee_id: EmployeeIdSchema.optional()
    .describe('Filter by specific employee ID'),
  response_format: ResponseFormatSchema
});

// Schema for training records query
export const GetTrainingRecordsSchema = z.object({
  employee_id: EmployeeIdSchema.optional()
    .describe('Employee ID (omit to get all employees)'),
  training_type_id: z.string().optional()
    .describe('Filter by training type ID'),
  completed_after: DateSchema.optional()
    .describe('Filter records completed after this date'),
  completed_before: DateSchema.optional()
    .describe('Filter records completed before this date'),
  response_format: ResponseFormatSchema
});

// Schema for goals status report
export const GetGoalsStatusReportSchema = z.object({
  status: z.enum(['in_progress', 'completed', 'on_hold', 'overdue', 'all']).optional().default('all')
    .describe("Filter by goal status ('overdue' shows goals past due date)"),
  group_by: z.enum(['status', 'department', 'employee']).optional().default('status')
    .describe('How to group the report results'),
  employee_id: EmployeeIdSchema.optional()
    .describe('Filter by specific employee ID'),
  response_format: ResponseFormatSchema
});

// Schema for overdue assessments
export const GetOverdueAssessmentsSchema = z.object({
  assessment_types: z.array(AssessmentTypeSchema).optional()
    .describe("Types of assessments to check (default: all types)"),
  min_days_overdue: z.number().int().min(0).optional().default(0)
    .describe('Minimum days overdue to include'),
  employee_id: EmployeeIdSchema.optional()
    .describe('Filter by specific employee ID'),
  response_format: ResponseFormatSchema
});

// Export types for use in tool handlers
export type GetCertificationsDueInput = z.infer<typeof GetCertificationsDueSchema>;
export type GetEmployeeCertificationSummaryInput = z.infer<typeof GetEmployeeCertificationSummarySchema>;
export type GetCompanyCertificationsReportInput = z.infer<typeof GetCompanyCertificationsReportSchema>;
export type GetEmployeesWithAssessmentsDueInput = z.infer<typeof GetEmployeesWithAssessmentsDueSchema>;
export type GetTrainingRecordsInput = z.infer<typeof GetTrainingRecordsSchema>;
export type GetGoalsStatusReportInput = z.infer<typeof GetGoalsStatusReportSchema>;
export type GetOverdueAssessmentsInput = z.infer<typeof GetOverdueAssessmentsSchema>;
