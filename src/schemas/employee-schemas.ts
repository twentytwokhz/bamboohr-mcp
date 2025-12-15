/**
 * Zod schemas for input validation
 */

import { z } from "zod";
import { ResponseFormat } from "../constants.js";

// Common schemas
export const ResponseFormatSchema = z.nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'json' for structured data or 'markdown' for human-readable");

export const PaginationSchema = {
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum number of results to return (1-100)"),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of results to skip for pagination")
};

export const EmployeeIdSchema = z.string()
  .min(1)
  .describe("Employee ID (numeric string)");

// Employee schemas
export const GetEmployeeSchema = z.object({
  employee_id: EmployeeIdSchema,
  fields: z.array(z.string())
    .optional()
    .describe("List of field names to retrieve. Leave empty for all accessible fields"),
  response_format: ResponseFormatSchema
}).strict();

export const GetEmployeesSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

export const GetEmployeeDirectorySchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

export const CreateEmployeeSchema = z.object({
  first_name: z.string().min(1).describe("Employee's first name"),
  last_name: z.string().min(1).describe("Employee's last name"),
  email: z.string().email().optional().describe("Employee's email address"),
  job_title: z.string().optional().describe("Job title"),
  department: z.string().optional().describe("Department name"),
  hire_date: z.string().optional().describe("Hire date in YYYY-MM-DD format"),
  mobile_phone: z.string().optional().describe("Mobile phone number"),
  work_phone: z.string().optional().describe("Work phone number"),
  additional_fields: z.record(z.string(), z.unknown()).optional()
    .describe("Additional custom fields as key-value pairs")
}).strict();

export const UpdateEmployeeSchema = z.object({
  employee_id: EmployeeIdSchema,
  fields: z.record(z.string(), z.unknown())
    .describe("Fields to update as key-value pairs (e.g., {\"jobTitle\": \"Manager\", \"department\": \"Sales\"})")
}).strict();

// Time Off schemas
export const GetTimeOffRequestsSchema = z.object({
  start_date: z.string().describe("Start date in YYYY-MM-DD format"),
  end_date: z.string().describe("End date in YYYY-MM-DD format"),
  employee_id: z.string().optional().describe("Filter by specific employee ID"),
  status: z.enum(['approved', 'denied', 'superceded', 'requested', 'canceled'])
    .optional()
    .describe("Filter by request status"),
  type_id: z.string().optional().describe("Filter by time off type ID"),
  response_format: ResponseFormatSchema
}).strict();

export const CreateTimeOffRequestSchema = z.object({
  employee_id: EmployeeIdSchema,
  time_off_type_id: z.string().describe("ID of the time off type"),
  start_date: z.string().describe("Start date in YYYY-MM-DD format"),
  end_date: z.string().describe("End date in YYYY-MM-DD format"),
  amount: z.number().positive().describe("Amount of time off in hours or days"),
  status: z.enum(['approved', 'requested']).default('requested')
    .describe("Initial status of the request"),
  notes: z.string().optional().describe("Notes for the time off request")
}).strict();

export const GetTimeOffPoliciesSchema = z.object({
  employee_id: EmployeeIdSchema.optional(),
  response_format: ResponseFormatSchema
}).strict();

export const GetWhosOutSchema = z.object({
  start_date: z.string().describe("Start date in YYYY-MM-DD format"),
  end_date: z.string().describe("End date in YYYY-MM-DD format"),
  response_format: ResponseFormatSchema
}).strict();

export const UpdateTimeOffBalanceSchema = z.object({
  employee_id: EmployeeIdSchema,
  time_off_type_id: z.string().describe("ID of the time off type"),
  adjustment_amount: z.number().describe("Amount to adjust (positive to add, negative to subtract)"),
  adjustment_date: z.string().describe("Date of adjustment in YYYY-MM-DD format"),
  note: z.string().optional().describe("Note explaining the adjustment")
}).strict();

// Benefits schemas
export const GetBenefitCoveragesSchema = z.object({
  employee_id: EmployeeIdSchema,
  response_format: ResponseFormatSchema
}).strict();

export const GetEmployeeDependentsSchema = z.object({
  employee_id: EmployeeIdSchema,
  response_format: ResponseFormatSchema
}).strict();

export const CreateEmployeeDependentSchema = z.object({
  employee_id: EmployeeIdSchema,
  first_name: z.string().min(1).describe("Dependent's first name"),
  last_name: z.string().min(1).describe("Dependent's last name"),
  relationship: z.string().describe("Relationship to employee (e.g., 'Spouse', 'Child')"),
  date_of_birth: z.string().optional().describe("Date of birth in YYYY-MM-DD format"),
  gender: z.enum(['Male', 'Female', 'Other']).optional().describe("Gender"),
  ssn: z.string().optional().describe("Social Security Number")
}).strict();

// Files schemas
export const ListCompanyFilesSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

export const ListEmployeeFilesSchema = z.object({
  employee_id: EmployeeIdSchema,
  response_format: ResponseFormatSchema
}).strict();

export const GetCompanyFileSchema = z.object({
  file_id: z.string().describe("Company file ID")
}).strict();

export const GetEmployeeFileSchema = z.object({
  employee_id: EmployeeIdSchema,
  file_id: z.string().describe("Employee file ID")
}).strict();

export const DeleteCompanyFileSchema = z.object({
  file_id: z.string().describe("Company file ID to delete")
}).strict();

export const DeleteEmployeeFileSchema = z.object({
  employee_id: EmployeeIdSchema,
  file_id: z.string().describe("Employee file ID to delete")
}).strict();

// Custom Reports schemas
export const GetReportsSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

export const RequestCustomReportSchema = z.object({
  title: z.string().optional().describe("Report title"),
  fields: z.array(z.string()).describe("List of field names to include in report (max 400)"),
  filters: z.record(z.string(), z.unknown()).optional()
    .describe("Filter criteria as key-value pairs"),
  format: z.enum(['JSON', 'XML', 'CSV', 'PDF']).default('JSON')
    .describe("Output format for the report"),
  only_current: z.boolean().optional()
    .describe("Include only current employees (exclude future-dated)")
}).strict();

export const GetCompanyReportSchema = z.object({
  report_number: z.number().int().positive()
    .describe("Report number (1=Company info, 2=Directory, etc.)"),
  format: z.enum(['JSON', 'XML', 'CSV', 'PDF']).optional()
    .describe("Output format"),
  only_current: z.boolean().optional()
    .describe("Include only current employees"),
  response_format: ResponseFormatSchema
}).strict();
