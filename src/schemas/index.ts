import { z } from "zod";
import { ResponseFormat, TIME_OFF_STATUSES, GOAL_STATUSES, DEFAULT_LIMIT, MAX_LIMIT } from "../constants.js";

// Common schemas
export const ResponseFormatSchema = z.nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable");

export const PaginationSchema = z.object({
  limit: z.number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT)
    .describe(`Maximum results to return (1-${MAX_LIMIT})`),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of results to skip for pagination")
}).strict();

// Employee schemas
export const GetEmployeeSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  fields: z.array(z.string())
    .optional()
    .describe("Specific fields to retrieve (e.g., ['firstName', 'lastName', 'jobTitle'])"),
  response_format: ResponseFormatSchema
}).strict();

export const GetEmployeesSchema = z.object({
  fields: z.array(z.string())
    .optional()
    .describe("Specific fields to retrieve for each employee"),
  filters: z.record(z.string(), z.any())
    .optional()
    .describe("Filter criteria (e.g., {'status': 'Active', 'department': 'Engineering'})"),
  sort_by: z.string()
    .optional()
    .describe("Field to sort by"),
  sort_order: z.enum(["asc", "desc"])
    .default("asc")
    .describe("Sort order"),
  response_format: ResponseFormatSchema
}).merge(PaginationSchema).strict();

export const GetDirectorySchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

export const CreateEmployeeSchema = z.object({
  first_name: z.string().describe("Employee's first name"),
  last_name: z.string().describe("Employee's last name"),
  employee_data: z.record(z.string(), z.any())
    .optional()
    .describe("Additional employee fields (e.g., {'jobTitle': 'Engineer', 'department': 'Tech'})")
}).strict();

export const UpdateEmployeeSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  employee_data: z.record(z.string(), z.any()).describe("Fields to update with their new values")
}).strict();

// Time Off schemas
export const GetTimeOffRequestsSchema = z.object({
  start_date: z.string()
    .optional()
    .describe("Start date for filtering (YYYY-MM-DD)"),
  end_date: z.string()
    .optional()
    .describe("End date for filtering (YYYY-MM-DD)"),
  employee_id: z.string()
    .optional()
    .describe("Filter by specific employee"),
  status: z.enum(TIME_OFF_STATUSES as any)
    .optional()
    .describe("Filter by status"),
  type_id: z.string()
    .optional()
    .describe("Filter by time off type ID"),
  response_format: ResponseFormatSchema
}).strict();

export const CreateTimeOffRequestSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  start: z.string().describe("Start date (YYYY-MM-DD)"),
  end: z.string().describe("End date (YYYY-MM-DD)"),
  time_off_type_id: z.string().describe("Time off type ID"),
  amount: z.number().describe("Amount of time off"),
  status: z.enum(["requested", "approved"]).default("requested").describe("Initial status"),
  notes: z.string().optional().describe("Optional notes")
}).strict();

export const UpdateTimeOffStatusSchema = z.object({
  request_id: z.string().describe("Time off request ID"),
  status: z.enum(["approved", "denied", "canceled"]).describe("New status"),
  note: z.string().optional().describe("Optional note")
}).strict();

export const GetTimeOffPoliciesSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  response_format: ResponseFormatSchema
}).strict();

export const AssignTimeOffPolicySchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  assignments: z.array(z.object({
    time_off_policy_id: z.number().describe("Policy ID"),
    accrual_start_date: z.string().describe("Accrual start date (YYYY-MM-DD)")
  })).describe("Policy assignments")
}).strict();

export const GetTimeOffBalanceSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  date: z.string().optional().describe("Date to check balance (YYYY-MM-DD, defaults to today)"),
  response_format: ResponseFormatSchema
}).strict();

export const AdjustTimeOffBalanceSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  time_off_type_id: z.string().describe("Time off type ID"),
  amount: z.number().describe("Amount to adjust (positive or negative)"),
  note: z.string().describe("Reason for adjustment")
}).strict();

export const GetWhosOutSchema = z.object({
  start_date: z.string().optional().describe("Start date (YYYY-MM-DD, defaults to today)"),
  end_date: z.string().optional().describe("End date (YYYY-MM-DD, defaults to today)"),
  response_format: ResponseFormatSchema
}).strict();

// Goal schemas
export const GetGoalsSchema = z.object({
  employee_id: z.string().optional().describe("Filter by employee ID"),
  status: z.enum(GOAL_STATUSES as any).optional().describe("Filter by status"),
  response_format: ResponseFormatSchema
}).merge(PaginationSchema).strict();

export const CreateGoalSchema = z.object({
  employee_id: z.string().describe("Employee ID who owns the goal"),
  title: z.string().describe("Goal title"),
  description: z.string().optional().describe("Goal description"),
  due_date: z.string().optional().describe("Due date (YYYY-MM-DD)"),
  shared_with_employee_ids: z.array(z.string())
    .optional()
    .describe("IDs of employees to share with")
}).strict();

export const UpdateGoalSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  goal_id: z.string().describe("Goal ID"),
  title: z.string().optional().describe("Updated title"),
  description: z.string().optional().describe("Updated description"),
  due_date: z.string().optional().describe("Updated due date"),
  percent_complete: z.number()
    .min(0)
    .max(100)
    .optional()
    .describe("Progress percentage")
}).strict();

export const CloseGoalSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  goal_id: z.string().describe("Goal ID")
}).strict();

export const CreateGoalCommentSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  goal_id: z.string().describe("Goal ID"),
  comment: z.string().describe("Comment text")
}).strict();

// Training schemas
export const GetEmployeeTrainingsSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  training_type_id: z.string()
    .optional()
    .describe("Filter by training type ID"),
  response_format: ResponseFormatSchema
}).strict();

export const CreateTrainingRecordSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  training_type_id: z.string().describe("Training type ID"),
  completed_date: z.string().describe("Completion date (YYYY-MM-DD)"),
  cost: z.string().optional().describe("Cost"),
  instructor: z.string().optional().describe("Instructor name"),
  credits: z.string().optional().describe("Credits earned"),
  notes: z.string().optional().describe("Notes")
}).strict();

export const CreateTrainingTypeSchema = z.object({
  name: z.string().describe("Training type name"),
  required: z.boolean().optional().describe("Is this training required?"),
  category_id: z.string().optional().describe("Category ID"),
  frequency_months: z.number().optional().describe("Frequency in months")
}).strict();

// Benefits schemas
export const GetBenefitCoveragesSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  response_format: ResponseFormatSchema
}).strict();

export const GetEmployeeDependentsSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  response_format: ResponseFormatSchema
}).strict();

export const CreateDependentSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  first_name: z.string().describe("Dependent's first name"),
  last_name: z.string().describe("Dependent's last name"),
  relationship: z.string().describe("Relationship to employee"),
  gender: z.string().describe("Gender"),
  date_of_birth: z.string().describe("Date of birth (YYYY-MM-DD)"),
  ssn: z.string().optional().describe("Social Security Number"),
  address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional()
  }).optional().describe("Address information")
}).strict();

// File schemas
export const GetEmployeeFilesSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  response_format: ResponseFormatSchema
}).strict();

export const UploadEmployeeFileSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  file_data: z.string().describe("Base64 encoded file data"),
  file_name: z.string().describe("File name"),
  category_id: z.string().optional().describe("File category ID"),
  share_with_employee: z.boolean()
    .default(false)
    .describe("Share file with employee")
}).strict();

export const GetCompanyFilesSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

export const UploadCompanyFileSchema = z.object({
  file_data: z.string().describe("Base64 encoded file data"),
  file_name: z.string().describe("File name"),
  category_id: z.string().optional().describe("File category ID")
}).strict();

// Applicant Tracking schemas
export const GetJobSummariesSchema = z.object({
  status_group: z.enum(["ALL", "OPEN", "DRAFT", "CLOSED", "ON_HOLD", "CANCELED"])
    .default("OPEN")
    .describe("Filter jobs by status group"),
  response_format: ResponseFormatSchema
}).strict();

export const CreateJobOpeningSchema = z.object({
  title: z.string().describe("Job title"),
  department: z.string().optional().describe("Department"),
  employment_status: z.string().optional().describe("Employment status"),
  minimum_experience: z.string().optional().describe("Minimum experience required"),
  description: z.string().optional().describe("Job description")
}).strict();

export const GetJobApplicationsSchema = z.object({
  job_id: z.string().describe("Job opening ID"),
  status_id: z.string().optional().describe("Filter by application status ID"),
  response_format: ResponseFormatSchema
}).strict();

export const CreateCandidateSchema = z.object({
  job_id: z.string().describe("Job opening ID"),
  first_name: z.string().describe("Candidate's first name"),
  last_name: z.string().describe("Candidate's last name"),
  email: z.string().email().describe("Candidate's email"),
  phone: z.string().optional().describe("Phone number"),
  resume: z.string().optional().describe("Base64 encoded resume"),
  source: z.string().optional().describe("Application source")
}).strict();

export const UpdateApplicationStatusSchema = z.object({
  application_id: z.string().describe("Application ID"),
  status_id: z.string().describe("New status ID")
}).strict();

// Time Tracking schemas
export const GetTimesheetEntriesSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  start_date: z.string().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().describe("End date (YYYY-MM-DD)"),
  response_format: ResponseFormatSchema
}).strict();

export const CreateTimesheetClockInSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  timestamp: z.string().optional().describe("Clock-in timestamp (ISO 8601, defaults to now)"),
  timezone: z.string().optional().describe("Timezone (e.g., 'America/New_York')"),
  note: z.string().optional().describe("Optional note")
}).strict();

export const CreateTimesheetClockOutSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  timestamp: z.string().optional().describe("Clock-out timestamp (ISO 8601, defaults to now)"),
  timezone: z.string().optional().describe("Timezone"),
  note: z.string().optional().describe("Optional note")
}).strict();

export const CreateTimeTrackingProjectSchema = z.object({
  name: z.string().describe("Project name"),
  billable: z.boolean().default(false).describe("Is project billable?"),
  allow_all_employees: z.boolean()
    .default(true)
    .describe("Allow all employees to track time"),
  employee_ids: z.array(z.string())
    .optional()
    .describe("Specific employee IDs (if not allowing all)")
}).strict();

// Hours schemas
export const CreateHourRecordSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  date: z.string().describe("Date hours worked (YYYY-MM-DD)"),
  hours: z.number().describe("Number of hours worked"),
  pay_code: z.string().optional().describe("Pay code"),
  job_code: z.string().optional().describe("Job code")
}).strict();

export const GetHourRecordSchema = z.object({
  hour_record_id: z.string().describe("Hour record ID"),
  response_format: ResponseFormatSchema
}).strict();

export const UpdateHourRecordSchema = z.object({
  hour_record_id: z.string().describe("Hour record ID"),
  hours: z.number().optional().describe("Updated hours"),
  pay_code: z.string().optional().describe("Updated pay code"),
  note: z.string().optional().describe("Note")
}).strict();

// Report schemas
export const GetCustomReportsSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

export const RequestCustomReportSchema = z.object({
  report_id: z.string().describe("Custom report ID"),
  format: z.enum(["CSV", "PDF", "XLS", "XML", "JSON"])
    .default("JSON")
    .describe("Report output format"),
  filters: z.record(z.string(), z.any())
    .optional()
    .describe("Optional filters to apply"),
  fd: z.enum(["yes", "no"])
    .default("no")
    .describe("Include only current employees ('yes') or all ('no')")
}).strict();

export const GetCompanyReportSchema = z.object({
  report_number: z.string().describe("Report number"),
  format: z.enum(["CSV", "PDF", "XLS", "XML", "JSON"])
    .default("JSON")
    .describe("Report format"),
  response_format: ResponseFormatSchema
}).strict();

// Tabular Data schemas
export const GetEmployeeTableRowsSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  table_name: z.string().describe("Table name (e.g., 'jobInfo', 'employmentStatus', 'compensation')"),
  response_format: ResponseFormatSchema
}).strict();

export const CreateTableRowSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  table_name: z.string().describe("Table name"),
  row_data: z.record(z.string(), z.any()).describe("Row data as key-value pairs")
}).strict();

export const UpdateTableRowSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  table_name: z.string().describe("Table name"),
  row_id: z.string().describe("Row ID"),
  row_data: z.record(z.string(), z.any()).describe("Updated row data")
}).strict();

export const DeleteTableRowSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  table_name: z.string().describe("Table name"),
  row_id: z.string().describe("Row ID")
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
  list_field_id: z.string().describe("List field ID (e.g., 'department', 'location')"),
  response_format: ResponseFormatSchema
}).strict();

export const UpdateListFieldValuesSchema = z.object({
  list_field_id: z.string().describe("List field ID"),
  values: z.array(z.object({
    id: z.string().optional().describe("Option ID (for updates)"),
    value: z.string().describe("Option value/name"),
    archived: z.boolean().optional().describe("Archive this option")
  })).describe("List of values to add/update")
}).strict();

// Webhook schemas
export const GetWebhooksSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

export const CreateWebhookSchema = z.object({
  name: z.string().describe("Webhook name"),
  url: z.string().url().describe("Webhook URL"),
  monitor_fields: z.array(z.string()).describe("Fields to monitor for changes"),
  post_fields: z.array(z.string()).describe("Fields to include in webhook payload"),
  format: z.enum(["application/json", "application/x-www-form-urlencoded"])
    .default("application/json")
    .describe("Payload format")
}).strict();

export const UpdateWebhookSchema = z.object({
  webhook_id: z.string().describe("Webhook ID"),
  name: z.string().optional().describe("Updated name"),
  url: z.string().url().optional().describe("Updated URL"),
  monitor_fields: z.array(z.string()).optional().describe("Updated monitor fields"),
  post_fields: z.array(z.string()).optional().describe("Updated post fields")
}).strict();

export const DeleteWebhookSchema = z.object({
  webhook_id: z.string().describe("Webhook ID to delete")
}).strict();

export const GetWebhookLogsSchema = z.object({
  webhook_id: z.string().describe("Webhook ID"),
  response_format: ResponseFormatSchema
}).merge(PaginationSchema).strict();

// Photo schemas
export const GetEmployeePhotoSchema = z.object({
  employee_id: z.string().describe("Employee ID")
}).strict();

export const UploadEmployeePhotoSchema = z.object({
  employee_id: z.string().describe("Employee ID"),
  photo_data: z.string().describe("Base64 encoded photo data (JPEG or PNG)")
}).strict();

// Last change schemas
export const GetChangedEmployeeIdsSchema = z.object({
  since: z.string().describe("ISO 8601 timestamp to check changes since"),
  type: z.enum(["inserted", "updated", "deleted"])
    .optional()
    .describe("Type of changes to retrieve"),
  response_format: ResponseFormatSchema
}).strict();
