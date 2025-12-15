/**
 * Zod schemas for additional BambooHR API endpoints
 */

import { z } from "zod";
import { ResponseFormatSchema, EmployeeIdSchema } from "./employee-schemas.js";

// Goals schemas
export const GetGoalsSchema = z.object({
  employee_id: EmployeeIdSchema.optional(),
  filter: z.enum(['self', 'all', 'shared_with_me']).optional()
    .describe("Filter goals by ownership/sharing"),
  response_format: ResponseFormatSchema
}).strict();

export const CreateGoalSchema = z.object({
  employee_id: EmployeeIdSchema,
  title: z.string().min(1).max(200).describe("Goal title"),
  description: z.string().optional().describe("Detailed description of the goal"),
  due_date: z.string().optional().describe("Due date in YYYY-MM-DD format"),
  percent_complete: z.number().min(0).max(100).optional().describe("Completion percentage (0-100)"),
  milestone_markers: z.array(z.object({
    date: z.string(),
    description: z.string()
  })).optional().describe("Milestone markers for the goal")
}).strict();

export const UpdateGoalSchema = z.object({
  goal_id: z.string().describe("Goal ID"),
  title: z.string().optional().describe("Updated goal title"),
  description: z.string().optional().describe("Updated description"),
  percent_complete: z.number().min(0).max(100).optional().describe("Updated completion percentage"),
  status: z.enum(['in_progress', 'completed', 'on_hold']).optional()
    .describe("Goal status")
}).strict();

export const DeleteGoalSchema = z.object({
  goal_id: z.string().describe("Goal ID to delete")
}).strict();

// Training schemas
export const GetEmployeeTrainingsSchema = z.object({
  employee_id: EmployeeIdSchema,
  training_type_id: z.string().optional().describe("Filter by training type ID"),
  response_format: ResponseFormatSchema
}).strict();

export const CreateEmployeeTrainingSchema = z.object({
  employee_id: EmployeeIdSchema,
  training_type_id: z.string().describe("Training type ID"),
  completed_date: z.string().describe("Completion date in YYYY-MM-DD format"),
  cost: z.string().optional().describe("Cost of training"),
  instructor: z.string().optional().describe("Instructor name"),
  credits: z.string().optional().describe("Credits earned"),
  notes: z.string().optional().describe("Additional notes")
}).strict();

export const GetTrainingTypesSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

export const CreateTrainingTypeSchema = z.object({
  name: z.string().min(1).describe("Training type name"),
  required: z.boolean().optional().describe("Whether this training is required"),
  category_id: z.string().optional().describe("Training category ID"),
  frequency: z.string().optional().describe("Required frequency (e.g., 'annually')")
}).strict();

// Webhooks schemas
export const GetWebhooksSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

export const CreateWebhookSchema = z.object({
  name: z.string().min(1).max(100).describe("Webhook name"),
  url: z.string().url().describe("Webhook URL (must be HTTPS)"),
  format: z.enum(['json', 'form']).default('json')
    .describe("Payload format"),
  fields: z.array(z.string()).describe("Fields to monitor for changes"),
  frequency: z.object({
    hour: z.number().int().min(0).max(23).optional(),
    minute: z.number().int().min(0).max(59).optional(),
    day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional()
  }).optional().describe("Schedule frequency for webhook (empty for real-time)"),
  post_fields: z.record(z.string(), z.string()).optional()
    .describe("Additional fields to include in POST body")
}).strict();

export const UpdateWebhookSchema = z.object({
  webhook_id: z.string().describe("Webhook ID"),
  name: z.string().optional().describe("Updated webhook name"),
  url: z.string().url().optional().describe("Updated webhook URL"),
  fields: z.array(z.string()).optional().describe("Updated fields to monitor")
}).strict();

export const DeleteWebhookSchema = z.object({
  webhook_id: z.string().describe("Webhook ID to delete")
}).strict();

export const GetWebhookLogsSchema = z.object({
  webhook_id: z.string().describe("Webhook ID"),
  limit: z.number().int().min(1).max(100).default(20)
    .describe("Number of log entries to retrieve"),
  response_format: ResponseFormatSchema
}).strict();

// Applicant Tracking schemas
export const GetJobSummariesSchema = z.object({
  status: z.enum(['open', 'on_hold', 'filled', 'cancelled', 'draft']).optional()
    .describe("Filter by job opening status"),
  response_format: ResponseFormatSchema
}).strict();

export const CreateJobOpeningSchema = z.object({
  job_title: z.string().min(1).describe("Job title"),
  location: z.string().optional().describe("Job location"),
  department: z.string().optional().describe("Department"),
  employment_status: z.string().optional().describe("Employment status (e.g., 'Full-time', 'Part-time')"),
  hiring_lead: z.string().optional().describe("Hiring lead employee ID"),
  minimum_experience: z.string().optional().describe("Minimum experience required"),
  job_description: z.string().optional().describe("Job description")
}).strict();

export const GetApplicationsSchema = z.object({
  job_id: z.string().optional().describe("Filter by job opening ID"),
  status_id: z.string().optional().describe("Filter by application status ID"),
  response_format: ResponseFormatSchema
}).strict();

export const CreateCandidateSchema = z.object({
  first_name: z.string().min(1).describe("Candidate's first name"),
  last_name: z.string().min(1).describe("Candidate's last name"),
  email: z.string().email().describe("Candidate's email"),
  phone: z.string().optional().describe("Phone number"),
  job_id: z.string().describe("Job opening ID to apply for"),
  source: z.string().optional().describe("Application source")
}).strict();

// Time Tracking/Hours schemas
export const GetTimesheetEntriesSchema = z.object({
  employee_id: EmployeeIdSchema,
  start_date: z.string().describe("Start date in YYYY-MM-DD format"),
  end_date: z.string().describe("End date in YYYY-MM-DD format"),
  response_format: ResponseFormatSchema
}).strict();

export const CreateHourRecordSchema = z.object({
  employee_id: EmployeeIdSchema,
  date: z.string().describe("Date in YYYY-MM-DD format"),
  hours: z.number().positive().describe("Number of hours"),
  project_id: z.string().optional().describe("Project ID"),
  task_id: z.string().optional().describe("Task ID"),
  note: z.string().optional().describe("Note about the hours")
}).strict();

export const CreateTimesheetClockInSchema = z.object({
  employee_id: EmployeeIdSchema,
  datetime: z.string().describe("Clock-in datetime in ISO 8601 format"),
  note: z.string().optional().describe("Note about clock-in"),
  project_id: z.string().optional().describe("Project ID")
}).strict();

export const CreateTimesheetClockOutSchema = z.object({
  employee_id: EmployeeIdSchema,
  datetime: z.string().describe("Clock-out datetime in ISO 8601 format"),
  note: z.string().optional().describe("Note about clock-out")
}).strict();

// Tabular Data schemas
export const GetEmployeeTableRowsSchema = z.object({
  employee_id: EmployeeIdSchema,
  table_name: z.string().describe("Table name (e.g., 'jobInfo', 'employmentStatus', 'compensation')"),
  response_format: ResponseFormatSchema
}).strict();

export const AddEmployeeTableRowSchema = z.object({
  employee_id: EmployeeIdSchema,
  table_name: z.string().describe("Table name"),
  data: z.record(z.string(), z.unknown()).describe("Row data as key-value pairs"),
  effective_date: z.string().optional().describe("Effective date in YYYY-MM-DD format")
}).strict();

export const UpdateEmployeeTableRowSchema = z.object({
  employee_id: EmployeeIdSchema,
  table_name: z.string().describe("Table name"),
  row_id: z.string().describe("Row ID to update"),
  data: z.record(z.string(), z.unknown()).describe("Updated row data as key-value pairs")
}).strict();

export const DeleteEmployeeTableRowSchema = z.object({
  employee_id: EmployeeIdSchema,
  table_name: z.string().describe("Table name"),
  row_id: z.string().describe("Row ID to delete")
}).strict();

// Metadata schemas
export const GetFieldsSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

export const GetTabularFieldsSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

export const GetUsersSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

export const GetListFieldDetailsSchema = z.object({
  field_name: z.string().describe("Field name to get details for"),
  response_format: ResponseFormatSchema
}).strict();

// Photos schemas
export const GetEmployeePhotoSchema = z.object({
  employee_id: EmployeeIdSchema,
  size: z.enum(['small', 'medium', 'large', 'original']).optional()
    .describe("Photo size")
}).strict();

// Last Change schemas
export const GetChangedEmployeeIdsSchema = z.object({
  since: z.string().describe("ISO 8601 timestamp to get changes since"),
  type: z.enum(['inserted', 'updated', 'deleted']).optional()
    .describe("Type of changes to retrieve"),
  response_format: ResponseFormatSchema
}).strict();
