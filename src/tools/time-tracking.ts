// Time Tracking tools
// Includes clock in/out, hour records, and timesheet management

import { z } from 'zod';
import { BambooHRClient } from '../services/bamboohr-client.js';
import { ResponseFormatSchema, EmployeeIdSchema, DateSchema } from '../schemas/common.js';
import { ResponseFormat } from '../constants.js';
import { formatGenericList, formatError, truncateIfNeeded, wrapListResponse } from '../services/formatting.js';

export function registerTimeTrackingTools(server: any, client: BambooHRClient): void {

  // ===== READ OPERATIONS =====

  // Get timesheet entries
  server.registerTool(
    'bamboohr_get_timesheet_entries',
    {
      title: 'Get Timesheet Entries',
      description: `Get timesheet entries for an employee within a date range.

Returns clock in/out records and time tracking data.

Args:
  - employee_id (string): Employee ID (required)
  - start_date (string): Start date (YYYY-MM-DD) (required)
  - end_date (string): End date (YYYY-MM-DD) (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of timesheet entry objects with date, clock times, and hours.

Examples:
  - "Show timesheet for employee 123 this week"
  - "Get time entries for employee 456 in January"`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        start_date: DateSchema,
        end_date: DateSchema,
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { employee_id: string; start_date: string; end_date: string; response_format: ResponseFormat }) => {
      try {
        const queryParams = {
          start: params.start_date,
          end: params.end_date
        };
        const entries = await client.get<Array<Record<string, unknown>>>(
          `/employees/${params.employee_id}/time_tracking/timesheets`,
          queryParams
        );

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(entries, 'timesheet_entries');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(entries, ResponseFormat.MARKDOWN, 'Timesheet Entries', ['date', 'clockIn', 'clockOut', 'hours']);
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

  // Get hour records
  server.registerTool(
    'bamboohr_get_hour_records',
    {
      title: 'Get Hour Records',
      description: `Get hour records for an employee within a date range.

Returns manually recorded hours for hourly employees.

Args:
  - employee_id (string): Employee ID (required)
  - start_date (string): Start date (YYYY-MM-DD) (required)
  - end_date (string): End date (YYYY-MM-DD) (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of hour record objects with date, hours, and notes.

Examples:
  - "Get hours worked by employee 123 last week"
  - "Show hour records for employee 456 in December"`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        start_date: DateSchema,
        end_date: DateSchema,
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { employee_id: string; start_date: string; end_date: string; response_format: ResponseFormat }) => {
      try {
        const queryParams = {
          start: params.start_date,
          end: params.end_date
        };
        const records = await client.get<Array<Record<string, unknown>>>(
          `/employees/${params.employee_id}/hour_records`,
          queryParams
        );

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(records, 'hour_records');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(records, ResponseFormat.MARKDOWN, 'Hour Records', ['date', 'hours', 'note']);
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

  // Get clock status
  server.registerTool(
    'bamboohr_get_clock_status',
    {
      title: 'Get Clock Status',
      description: `Get current clock in/out status for an employee.

Returns whether the employee is currently clocked in and their last clock time.

Args:
  - employee_id (string): Employee ID (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Clock status with current state and timestamps.

Examples:
  - "Is employee 123 clocked in?"
  - "Check clock status for employee 456"`,
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
        const status = await client.get<Record<string, unknown>>(
          `/employees/${params.employee_id}/time_tracking/status`
        );

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(status, null, 2) }]
          };
        }

        const clockedIn = status.isClockedIn ? 'Yes' : 'No';
        const lastAction = status.lastClockIn || status.lastClockOut || 'Unknown';
        return {
          content: [{ type: 'text' as const, text: `# Clock Status for Employee ${params.employee_id}\n\n**Currently Clocked In:** ${clockedIn}\n**Last Action:** ${lastAction}` }]
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

  // Clock in
  server.registerTool(
    'bamboohr_clock_in',
    {
      title: 'Clock In Employee',
      description: `Clock in an employee for time tracking.

Records the start of a work period for an employee.

Args:
  - employee_id (string): Employee ID (required)
  - timestamp (string): Clock-in timestamp in ISO 8601 format (optional, defaults to now)
  - timezone (string): Timezone (e.g., 'America/New_York') (optional)
  - note (string): Optional note (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation with clock-in time.

Examples:
  - "Clock in employee 123"
  - "Record clock in for employee 456 at 9am"`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        timestamp: z.string().optional().describe('Clock-in timestamp (ISO 8601)'),
        timezone: z.string().optional().describe('Timezone'),
        note: z.string().optional().describe('Note'),
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
      timestamp?: string;
      timezone?: string;
      note?: string;
      response_format: ResponseFormat
    }) => {
      try {
        const clockInData: Record<string, unknown> = {};
        if (params.timestamp) clockInData.timestamp = params.timestamp;
        if (params.timezone) clockInData.timezone = params.timezone;
        if (params.note) clockInData.note = params.note;

        await client.post(`/employees/${params.employee_id}/time_tracking/clock_in`, clockInData);

        const timestamp = params.timestamp || new Date().toISOString();
        const message = `Successfully clocked in employee ${params.employee_id} at ${timestamp}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              employee_id: params.employee_id,
              action: 'clock_in',
              timestamp: timestamp
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

  // Clock out
  server.registerTool(
    'bamboohr_clock_out',
    {
      title: 'Clock Out Employee',
      description: `Clock out an employee for time tracking.

Records the end of a work period for an employee.

Args:
  - employee_id (string): Employee ID (required)
  - timestamp (string): Clock-out timestamp in ISO 8601 format (optional, defaults to now)
  - timezone (string): Timezone (optional)
  - note (string): Optional note (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation with clock-out time.

Examples:
  - "Clock out employee 123"
  - "Record clock out for employee 456 at 5pm"`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        timestamp: z.string().optional().describe('Clock-out timestamp (ISO 8601)'),
        timezone: z.string().optional().describe('Timezone'),
        note: z.string().optional().describe('Note'),
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
      timestamp?: string;
      timezone?: string;
      note?: string;
      response_format: ResponseFormat
    }) => {
      try {
        const clockOutData: Record<string, unknown> = {};
        if (params.timestamp) clockOutData.timestamp = params.timestamp;
        if (params.timezone) clockOutData.timezone = params.timezone;
        if (params.note) clockOutData.note = params.note;

        await client.post(`/employees/${params.employee_id}/time_tracking/clock_out`, clockOutData);

        const timestamp = params.timestamp || new Date().toISOString();
        const message = `Successfully clocked out employee ${params.employee_id} at ${timestamp}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              employee_id: params.employee_id,
              action: 'clock_out',
              timestamp: timestamp
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

  // Add hour record
  server.registerTool(
    'bamboohr_add_hour_record',
    {
      title: 'Add Hour Record',
      description: `Add an hour record for an employee.

Manually records hours worked for hourly employees.

Args:
  - employee_id (string): Employee ID (required)
  - date (string): Date hours worked (YYYY-MM-DD) (required)
  - hours (number): Number of hours worked (required)
  - project_id (string): Project ID for time allocation (optional)
  - task_id (string): Task ID for time allocation (optional)
  - note (string): Note about the hours (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation with record ID.

Examples:
  - "Add 8 hours for employee 123 on January 15"
  - "Record 4 hours of overtime for employee 456"`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        date: DateSchema,
        hours: z.number().min(0).max(24).describe('Hours worked'),
        project_id: z.string().optional().describe('Project ID'),
        task_id: z.string().optional().describe('Task ID'),
        note: z.string().optional().describe('Note'),
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
      date: string;
      hours: number;
      project_id?: string;
      task_id?: string;
      note?: string;
      response_format: ResponseFormat
    }) => {
      try {
        const hourData = {
          date: params.date,
          hours: params.hours,
          ...(params.project_id && { projectId: params.project_id }),
          ...(params.task_id && { taskId: params.task_id }),
          ...(params.note && { note: params.note })
        };

        const result = await client.post<{ id?: string }>(
          `/employees/${params.employee_id}/hour_records`,
          hourData
        );

        const recordId = result?.id || 'created';
        const message = `Successfully added ${params.hours} hours for employee ${params.employee_id} on ${params.date}. Record ID: ${recordId}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              record_id: recordId,
              employee_id: params.employee_id,
              date: params.date,
              hours: params.hours
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

  // Update hour record
  server.registerTool(
    'bamboohr_update_hour_record',
    {
      title: 'Update Hour Record',
      description: `Update an existing hour record.

Modifies hours or notes for an existing time entry.

Args:
  - record_id (string): Hour record ID to update (required)
  - hours (number): Updated hours (optional)
  - note (string): Updated note (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation.

Examples:
  - "Change record 789 to 7.5 hours"
  - "Add a note to hour record 456"`,
      inputSchema: z.object({
        record_id: z.string().describe('Hour record ID'),
        hours: z.number().min(0).max(24).optional().describe('Updated hours'),
        note: z.string().optional().describe('Updated note'),
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
      record_id: string;
      hours?: number;
      note?: string;
      response_format: ResponseFormat
    }) => {
      try {
        const updateData: Record<string, unknown> = {};
        if (params.hours !== undefined) updateData.hours = params.hours;
        if (params.note) updateData.note = params.note;

        if (Object.keys(updateData).length === 0) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: 'No update fields provided. Please specify hours or note to update.' }]
          };
        }

        await client.put(`/hour_records/${params.record_id}`, updateData);

        const message = `Successfully updated hour record ${params.record_id}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              record_id: params.record_id,
              updated_fields: Object.keys(updateData)
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

  // Get time tracking projects
  server.registerTool(
    'bamboohr_get_time_tracking_projects',
    {
      title: 'Get Time Tracking Projects',
      description: `Get available time tracking projects.

Returns projects that can be used when recording hours.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of project objects with id and name.`,
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
        const projects = await client.get<Array<Record<string, unknown>>>('/time_tracking/projects');

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(projects, 'projects');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(projects, ResponseFormat.MARKDOWN, 'Time Tracking Projects', ['id', 'name']);
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
}
