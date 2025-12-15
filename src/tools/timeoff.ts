// Time Off management tools - Full CRUD operations
// Includes read and write operations for time off requests and policies

import { z } from 'zod';
import { BambooHRClient } from '../services/bamboohr-client.js';
import { ResponseFormatSchema, EmployeeIdSchema, DateSchema } from '../schemas/common.js';
import { ResponseFormat } from '../constants.js';
import { formatGenericList, formatError, truncateIfNeeded, wrapListResponse } from '../services/formatting.js';

export function registerTimeOffTools(server: any, client: BambooHRClient): void {

  // ===== READ OPERATIONS =====

  // Get time off requests
  server.registerTool(
    'bamboohr_get_time_off_requests',
    {
      title: 'Get Time Off Requests',
      description: `Get time off requests with optional filtering.

Returns time off requests for employees, with optional filters for date range, status, and employee.

Args:
  - start_date (string): Start date filter (YYYY-MM-DD format, optional)
  - end_date (string): End date filter (YYYY-MM-DD format, optional)
  - employee_id (string): Filter by employee ID (optional)
  - status (string): Filter by status - 'approved', 'denied', 'requested', 'canceled', 'superceded' (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of time off request objects with details including dates, type, status, and employee information.

Examples:
  - "Show all time off requests for this month"
  - "Get approved time off for employee 123"
  - "List pending time off requests"`,
      inputSchema: z.object({
        start_date: DateSchema.optional(),
        end_date: DateSchema.optional(),
        employee_id: EmployeeIdSchema.optional(),
        status: z.enum(['approved', 'denied', 'superceded', 'requested', 'canceled']).optional().describe('Request status'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { start_date?: string; end_date?: string; employee_id?: string; status?: string; response_format: ResponseFormat }) => {
      try {
        const queryParams: Record<string, string> = {};
        if (params.start_date) queryParams.start = params.start_date;
        if (params.end_date) queryParams.end = params.end_date;
        if (params.employee_id) queryParams.employeeId = params.employee_id;
        if (params.status) queryParams.status = params.status;

        const requests = await client.get<Array<Record<string, unknown>>>('/time_off/requests', queryParams);

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(requests, 'time_off_requests');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(requests, ResponseFormat.MARKDOWN, 'Time Off Requests', ['name', 'type', 'start', 'end', 'status']);
        return {
          content: [{ type: 'text' as const, text: truncateIfNeeded(formatted) }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // Get who's out
  server.registerTool(
    'bamboohr_get_whos_out',
    {
      title: 'Get Who\'s Out',
      description: `Get a list of employees who are out on time off.

Returns employees currently out or scheduled to be out, optionally filtered by date range.

Args:
  - start_date (string): Start date (YYYY-MM-DD format, optional, defaults to today)
  - end_date (string): End date (YYYY-MM-DD format, optional, defaults to today)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of employees out with their time off details.

Examples:
  - "Who's out today?"
  - "Show me who's out next week"
  - "List employees on vacation this month"`,
      inputSchema: z.object({
        start_date: DateSchema.optional(),
        end_date: DateSchema.optional(),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { start_date?: string; end_date?: string; response_format: ResponseFormat }) => {
      try {
        const queryParams: Record<string, string> = {};
        if (params.start_date) queryParams.start = params.start_date;
        if (params.end_date) queryParams.end = params.end_date;

        const whosOut = await client.get<Array<Record<string, unknown>>>('/time_off/whos_out', queryParams);

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(whosOut, 'employees_out');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(whosOut, ResponseFormat.MARKDOWN, 'Who\'s Out', ['name', 'type', 'start', 'end']);
        return {
          content: [{ type: 'text' as const, text: formatted }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // Get time off types
  server.registerTool(
    'bamboohr_get_time_off_types',
    {
      title: 'Get Time Off Types',
      description: `Get all available time off types/categories.

Returns configured time off types like vacation, sick leave, personal time, etc.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of time off type objects with id, name, and configuration details.`,
      inputSchema: z.object({
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { response_format: ResponseFormat }) => {
      try {
        const types = await client.get<Array<Record<string, unknown>>>('/meta/time_off/types');

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(types, 'time_off_types');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(types, ResponseFormat.MARKDOWN, 'Time Off Types', ['id', 'name']);
        return {
          content: [{ type: 'text' as const, text: formatted }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // Get employee time off policies
  server.registerTool(
    'bamboohr_get_employee_time_off_policies',
    {
      title: 'Get Employee Time Off Policies',
      description: `Get time off policies assigned to a specific employee.

Returns all time off policies/accruals for an employee, including balances and accrual rates.

Args:
  - employee_id (string): Employee ID
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of policy objects with accrual information and current balances.

Examples:
  - "Show time off policies for employee 123"
  - "What is employee 456's vacation balance?"`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { employee_id: string; response_format: ResponseFormat }) => {
      try {
        const policies = await client.get<Array<Record<string, unknown>>>(`/employees/${params.employee_id}/time_off/policies`);

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(policies, 'policies');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(policies, ResponseFormat.MARKDOWN, 'Time Off Policies', ['timeOffType', 'balance', 'accrualRate']);
        return {
          content: [{ type: 'text' as const, text: formatted }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // Get time off policies (all)
  server.registerTool(
    'bamboohr_get_time_off_policies',
    {
      title: 'Get All Time Off Policies',
      description: `Get all time off policies configured in the system.

Returns company-wide time off policies.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of policy objects with configuration details.`,
      inputSchema: z.object({
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { response_format: ResponseFormat }) => {
      try {
        const policies = await client.get<Array<Record<string, unknown>>>('/time_off/policies');

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(policies, 'policies');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(policies, ResponseFormat.MARKDOWN, 'Time Off Policies', ['name', 'timeOffType']);
        return {
          content: [{ type: 'text' as const, text: formatted }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // ===== WRITE OPERATIONS =====

  // Create time off request
  server.registerTool(
    'bamboohr_create_time_off_request',
    {
      title: 'Create Time Off Request',
      description: `Create a new time off request for an employee.

Submits a time off request with specified details. The request can be marked as approved immediately
if the user has appropriate permissions.

Args:
  - employee_id (string): Employee ID for the request (required)
  - start_date (string): Start date (YYYY-MM-DD format) (required)
  - end_date (string): End date (YYYY-MM-DD format) (required)
  - time_off_type_id (string): Time off type ID (use bamboohr_get_time_off_types to see available types) (required)
  - amount (number): Amount of time off in days or hours depending on policy (required)
  - status (string): 'approved' or 'requested' (optional, defaults to 'requested')
  - notes (string): Additional notes for the request (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Created time off request details including request ID.

Examples:
  - "Request vacation for employee 123 from Dec 20-25"
  - "Create sick leave request for tomorrow"

Error Handling:
  - Returns validation errors if dates are invalid or overlap existing requests
  - Returns "Access forbidden" if user lacks permission (403)`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        start_date: DateSchema,
        end_date: DateSchema,
        time_off_type_id: z.string().describe('Time off type ID'),
        amount: z.number().describe('Amount of time off in days or hours'),
        status: z.enum(['approved', 'requested']).optional().default('requested').describe('Request status'),
        notes: z.string().optional().describe('Optional notes'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params: {
      employee_id: string;
      start_date: string;
      end_date: string;
      time_off_type_id: string;
      amount: number;
      status?: string;
      notes?: string;
      response_format: ResponseFormat
    }) => {
      try {
        const requestData = {
          start: params.start_date,
          end: params.end_date,
          timeOffTypeId: params.time_off_type_id,
          amount: params.amount,
          status: params.status || 'requested',
          ...(params.notes && { notes: params.notes })
        };

        // BambooHR uses PUT for creating time off requests
        const result = await client.put<{ id?: string }>(`/employees/${params.employee_id}/time_off/request`, requestData);

        const requestId = result?.id || 'created';
        const message = `Successfully created time off request for employee ${params.employee_id}. Request ID: ${requestId}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              request_id: requestId,
              employee_id: params.employee_id,
              start_date: params.start_date,
              end_date: params.end_date,
              status: params.status || 'requested'
            }, null, 2) }]
          };
        }

        return {
          content: [{ type: 'text' as const, text: message }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // Change time off request status (approve/deny/cancel)
  server.registerTool(
    'bamboohr_change_time_off_request_status',
    {
      title: 'Change Time Off Request Status',
      description: `Approve, deny, or cancel a time off request.

Allows managers to approve or deny time off requests, or employees to cancel their own requests.

**Safety Note:** When denying a request, you must provide a note explaining the reason.

Args:
  - request_id (string): Time off request ID (required)
  - status (string): New status - 'approved', 'denied', or 'canceled' (required)
  - note (string): Note explaining the decision (required when denying, optional otherwise)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation.

Examples:
  - "Approve time off request 456"
  - "Deny vacation request with note 'Insufficient coverage'"
  - "Cancel my time off request 789"

Error Handling:
  - Returns "Resource not found" if request doesn't exist (404)
  - Returns "Access forbidden" if user lacks permission to change status (403)`,
      inputSchema: z.object({
        request_id: z.string().describe('Time off request ID'),
        status: z.enum(['approved', 'denied', 'canceled']).describe('New status'),
        note: z.string().optional().describe('Note explaining the decision (required for denial)'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,  // Status changes are idempotent
        openWorldHint: true
      }
    },
    async (params: { request_id: string; status: string; note?: string; response_format: ResponseFormat }) => {
      try {
        // Require note for denials
        if (params.status === 'denied' && !params.note) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: 'A note is required when denying a time off request. Please provide a reason for the denial.' }]
          };
        }

        const updateData = {
          status: params.status,
          ...(params.note && { note: params.note })
        };

        await client.put(`/time_off/requests/${params.request_id}/status`, updateData);

        const message = `Successfully updated time off request ${params.request_id} to status: ${params.status}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              request_id: params.request_id,
              new_status: params.status
            }, null, 2) }]
          };
        }

        return {
          content: [{ type: 'text' as const, text: message }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // Adjust time off balance
  server.registerTool(
    'bamboohr_adjust_time_off_balance',
    {
      title: 'Adjust Time Off Balance',
      description: `Adjust an employee's time off balance (add or subtract hours/days).

Manually adjust PTO balances for corrections, special grants, or deductions.

**Safety Note:** Negative adjustments (reducing balance) require careful consideration.

Args:
  - employee_id (string): Employee ID (required)
  - time_off_type_id (string): Time off type ID to adjust (required)
  - adjustment_amount (number): Amount to adjust (positive to add, negative to subtract) (required)
  - effective_date (string): Date the adjustment takes effect (YYYY-MM-DD) (required)
  - note (string): Reason for the adjustment (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation with new balance.

Examples:
  - "Add 8 hours of vacation for employee 123 as a bonus"
  - "Deduct 4 hours of sick time that was incorrectly added"

Error Handling:
  - Returns "Access forbidden" if user lacks permission (403)
  - Returns validation error if balance would go negative`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        time_off_type_id: z.string().describe('Time off type ID'),
        adjustment_amount: z.number().describe('Amount to adjust (positive to add, negative to subtract)'),
        effective_date: DateSchema,
        note: z.string().describe('Reason for the adjustment'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: {
      employee_id: string;
      time_off_type_id: string;
      adjustment_amount: number;
      effective_date: string;
      note: string;
      response_format: ResponseFormat
    }) => {
      try {
        const adjustmentData = {
          timeOffTypeId: params.time_off_type_id,
          amount: params.adjustment_amount,
          date: params.effective_date,
          note: params.note
        };

        await client.put(`/employees/${params.employee_id}/time_off/balance_adjustment`, adjustmentData);

        const adjustmentType = params.adjustment_amount >= 0 ? 'added' : 'deducted';
        const message = `Successfully ${adjustmentType} ${Math.abs(params.adjustment_amount)} hours/days for employee ${params.employee_id}. Reason: ${params.note}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              employee_id: params.employee_id,
              time_off_type_id: params.time_off_type_id,
              adjustment: params.adjustment_amount,
              effective_date: params.effective_date
            }, null, 2) }]
          };
        }

        return {
          content: [{ type: 'text' as const, text: message }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // Assign time off policy to employee
  server.registerTool(
    'bamboohr_assign_time_off_policy',
    {
      title: 'Assign Time Off Policy',
      description: `Assign a time off policy to an employee.

Associates an employee with a specific time off policy for accrual tracking.

Args:
  - employee_id (string): Employee ID (required)
  - time_off_type_id (string): Time off type ID (required)
  - accrual_start_date (string): Date accrual begins (YYYY-MM-DD) (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation.

Examples:
  - "Assign the standard vacation policy to new employee 123"
  - "Add sick time policy starting from hire date"

Error Handling:
  - Returns "Access forbidden" if user lacks permission (403)
  - Returns error if policy doesn't exist`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        time_off_type_id: z.string().describe('Time off type/policy ID to assign'),
        accrual_start_date: DateSchema.describe('Date accrual begins'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: {
      employee_id: string;
      time_off_type_id: string;
      accrual_start_date: string;
      response_format: ResponseFormat
    }) => {
      try {
        const policyData = {
          timeOffTypeId: params.time_off_type_id,
          accrualStartDate: params.accrual_start_date
        };

        await client.put(`/employees/${params.employee_id}/time_off/policies`, policyData);

        const message = `Successfully assigned time off policy ${params.time_off_type_id} to employee ${params.employee_id}, starting ${params.accrual_start_date}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              employee_id: params.employee_id,
              time_off_type_id: params.time_off_type_id,
              accrual_start_date: params.accrual_start_date
            }, null, 2) }]
          };
        }

        return {
          content: [{ type: 'text' as const, text: message }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );
}
