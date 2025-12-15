// Metadata, Training, and Field management tools
// Includes read operations for metadata and CRUD for training records

import { z } from 'zod';
import { BambooHRClient } from '../services/bamboohr-client.js';
import { ResponseFormatSchema, EmployeeIdSchema, DateSchema } from '../schemas/common.js';
import { ResponseFormat } from '../constants.js';
import { formatGenericList, formatError, truncateIfNeeded, wrapListResponse } from '../services/formatting.js';

export function registerMetadataTools(server: any, client: BambooHRClient): void {

  // ===== METADATA READ OPERATIONS =====

  // Get available fields
  server.registerTool(
    'bamboohr_get_fields',
    {
      title: 'Get Available Fields',
      description: `Get a list of all available employee fields and their details.

Returns metadata about all fields in the system, including field names, types, and whether they're custom fields.
This is essential for understanding what data can be retrieved.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of field definitions with id, name, type, and other metadata.

Examples:
  - "What fields are available for employees?"
  - "List all custom fields"`,
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
        const fields = await client.get<Array<Record<string, unknown>>>('/meta/fields');

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(fields, 'fields');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(fields, ResponseFormat.MARKDOWN, 'Available Fields', ['id', 'name', 'type']);
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

  // Get list field values (for dropdowns like department, location, etc.)
  server.registerTool(
    'bamboohr_get_list_field_values',
    {
      title: 'Get List Field Values',
      description: `Get available values for a list/dropdown field.

Returns all options configured for dropdown fields like department, location, division, etc.

Args:
  - list_field_id (string): List field ID (e.g., 'department', 'location', 'division')
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of field option objects with IDs and values.`,
      inputSchema: z.object({
        list_field_id: z.string().describe('List field ID'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { list_field_id: string; response_format: ResponseFormat }) => {
      try {
        const values = await client.get<Array<Record<string, unknown>>>(`/meta/lists/${params.list_field_id}`);

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(values, 'options');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(values, ResponseFormat.MARKDOWN, `${params.list_field_id} Options`, ['id', 'value', 'archived']);
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

  // Get changed employees
  server.registerTool(
    'bamboohr_get_changed_employees',
    {
      title: 'Get Changed Employees',
      description: `Get list of employees that have changed since a specific timestamp.

Efficient way to sync employee data by only fetching employees who have been inserted, updated, or deleted since the last sync.

Args:
  - since_timestamp (string): ISO 8601 timestamp (e.g., "2024-01-15T10:30:00Z") (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Object containing latest timestamp and array of changed employees with their action (Inserted, Updated, or Deleted).

Examples:
  - "Check for employee changes since yesterday"
  - "Sync employee data incrementally"`,
      inputSchema: z.object({
        since_timestamp: z.string().describe('ISO 8601 timestamp'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { since_timestamp: string; response_format: ResponseFormat }) => {
      try {
        const changes = await client.get<Record<string, unknown>>('/employees/changed', { since: params.since_timestamp });

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(changes, null, 2) }]
          };
        }

        return {
          content: [{ type: 'text' as const, text: `Employee Changes:\n\n${JSON.stringify(changes, null, 2)}` }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // Get employee birthdays (via custom report)
  server.registerTool(
    'bamboohr_get_employee_birthdays',
    {
      title: 'Get Employee Birthdays',
      description: `Get employee birthdays via custom report.

Retrieves date of birth information for employees.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Employee birthday information including name and date of birth.

Examples:
  - "Show all employee birthdays"
  - "Who has a birthday this month?"

Note: This uses a custom report to retrieve birthday information.`,
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
        // Use custom report to get birthdays
        const reportData = {
          title: 'Employee Birthdays',
          fields: ['displayName', 'firstName', 'lastName', 'dateOfBirth', 'department']
        };

        const result = await client.post<{ employees: Array<Record<string, unknown>> }>('/reports/custom', reportData, { format: 'JSON' });
        const employees = result.employees || [];

        // Filter only employees with dateOfBirth
        const employeesWithBirthdays = employees.filter(emp => emp.dateOfBirth);

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(employeesWithBirthdays, 'employees');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(employeesWithBirthdays, ResponseFormat.MARKDOWN, 'Employee Birthdays', ['displayName', 'dateOfBirth', 'department']);
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

  // ===== TRAINING READ OPERATIONS =====

  // Get training types
  server.registerTool(
    'bamboohr_get_training_types',
    {
      title: 'Get Training Types',
      description: `Get all available training types/categories.

Returns configured training types that are used in the system.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of training type objects with id and name.`,
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
        const types = await client.get<Array<Record<string, unknown>>>('/meta/training/types');

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(types, 'training_types');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(types, ResponseFormat.MARKDOWN, 'Training Types', ['id', 'name']);
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

  // Get training categories
  server.registerTool(
    'bamboohr_get_training_categories',
    {
      title: 'Get Training Categories',
      description: `Get all available training categories.

Returns training category information.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of training category objects.`,
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
        const categories = await client.get<Array<Record<string, unknown>>>('/meta/training/categories');

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(categories, 'training_categories');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(categories, ResponseFormat.MARKDOWN, 'Training Categories', ['id', 'name']);
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

  // ===== TRAINING WRITE OPERATIONS =====

  // Add training record
  server.registerTool(
    'bamboohr_add_training_record',
    {
      title: 'Add Training Record',
      description: `Add a training completion record for an employee.

Records that an employee has completed a training course or certification.

Args:
  - employee_id (string): Employee ID (required)
  - training_type_id (string): Training type ID (use bamboohr_get_training_types to see options) (required)
  - completed_date (string): Date training was completed (YYYY-MM-DD) (required)
  - notes (string): Notes about the training (optional)
  - cost (number): Cost of the training (optional)
  - credits (number): Credits/CEUs earned (optional)
  - hours (number): Hours of training (optional)
  - instructor (string): Instructor name (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation with record ID.

Examples:
  - "Record that employee 123 completed safety training on Jan 15"
  - "Add AWS certification for employee 456"`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        training_type_id: z.string().describe('Training type ID'),
        completed_date: DateSchema.describe('Date training was completed'),
        notes: z.string().optional().describe('Notes about the training'),
        cost: z.number().optional().describe('Cost of the training'),
        credits: z.number().optional().describe('Credits/CEUs earned'),
        hours: z.number().optional().describe('Hours of training'),
        instructor: z.string().optional().describe('Instructor name'),
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
      training_type_id: string;
      completed_date: string;
      notes?: string;
      cost?: number;
      credits?: number;
      hours?: number;
      instructor?: string;
      response_format: ResponseFormat
    }) => {
      try {
        const trainingData = {
          employeeId: params.employee_id,
          trainingTypeId: params.training_type_id,
          completed: params.completed_date,
          ...(params.notes && { notes: params.notes }),
          ...(params.cost !== undefined && { cost: params.cost }),
          ...(params.credits !== undefined && { credits: params.credits }),
          ...(params.hours !== undefined && { hours: params.hours }),
          ...(params.instructor && { instructor: params.instructor })
        };

        const result = await client.post<{ id?: string }>(`/training/record/${params.employee_id}`, trainingData);

        const recordId = result?.id || 'created';
        const message = `Successfully added training record for employee ${params.employee_id}. Record ID: ${recordId}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              record_id: recordId,
              employee_id: params.employee_id,
              training_type_id: params.training_type_id,
              completed_date: params.completed_date
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

  // Update training record
  server.registerTool(
    'bamboohr_update_training_record',
    {
      title: 'Update Training Record',
      description: `Update an existing training record.

Modifies details of a training completion record.

Args:
  - record_id (string): Training record ID to update (required)
  - completed_date (string): New completion date (YYYY-MM-DD) (optional)
  - notes (string): Updated notes (optional)
  - cost (number): Updated cost (optional)
  - credits (number): Updated credits (optional)
  - hours (number): Updated hours (optional)
  - instructor (string): Updated instructor (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation.

Examples:
  - "Update the completion date for training record 789"
  - "Add notes to training record 456"`,
      inputSchema: z.object({
        record_id: z.string().describe('Training record ID'),
        completed_date: DateSchema.optional().describe('New completion date'),
        notes: z.string().optional().describe('Updated notes'),
        cost: z.number().optional().describe('Updated cost'),
        credits: z.number().optional().describe('Updated credits'),
        hours: z.number().optional().describe('Updated hours'),
        instructor: z.string().optional().describe('Updated instructor'),
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
      completed_date?: string;
      notes?: string;
      cost?: number;
      credits?: number;
      hours?: number;
      instructor?: string;
      response_format: ResponseFormat
    }) => {
      try {
        const updateData: Record<string, unknown> = {};
        if (params.completed_date) updateData.completed = params.completed_date;
        if (params.notes) updateData.notes = params.notes;
        if (params.cost !== undefined) updateData.cost = params.cost;
        if (params.credits !== undefined) updateData.credits = params.credits;
        if (params.hours !== undefined) updateData.hours = params.hours;
        if (params.instructor) updateData.instructor = params.instructor;

        if (Object.keys(updateData).length === 0) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: 'No update fields provided. Please specify at least one field to update.' }]
          };
        }

        await client.put(`/training/record/${params.record_id}`, updateData);

        const message = `Successfully updated training record ${params.record_id}`;

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

  // Delete training record (DESTRUCTIVE - requires confirmation)
  server.registerTool(
    'bamboohr_delete_training_record',
    {
      title: 'Delete Training Record',
      description: `Delete a training record.

**⚠️ DESTRUCTIVE OPERATION:** This permanently removes the training record. Requires explicit confirmation.

Args:
  - record_id (string): Training record ID to delete (required)
  - confirm (boolean): Must be set to true to confirm deletion (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation.

Error Handling:
  - Returns error if confirm is not true
  - Returns "Resource not found" if record doesn't exist (404)
  - Returns "Access forbidden" if user lacks permission (403)`,
      inputSchema: z.object({
        record_id: z.string().describe('Training record ID to delete'),
        confirm: z.boolean().describe('Must be true to confirm deletion'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,  // DESTRUCTIVE!
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { record_id: string; confirm: boolean; response_format: ResponseFormat }) => {
      try {
        // Safety check
        if (!params.confirm) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: 'Safety confirmation required. Set confirm: true to permanently delete this training record. This action cannot be undone.' }]
          };
        }

        await client.delete(`/training/record/${params.record_id}`);

        const message = `Successfully deleted training record ${params.record_id}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              deleted_record_id: params.record_id
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

  // ===== LIST FIELD MANAGEMENT =====

  // Update list field values
  server.registerTool(
    'bamboohr_update_list_field_values',
    {
      title: 'Update List Field Values',
      description: `Update options for a list/dropdown field.

Adds, updates, or archives options for dropdown fields like department, location, etc.

Args:
  - list_field_id (string): List field ID to update (required)
  - options (array): Array of option objects with value and optional id for updates (required)
    - For new options: { "value": "New Option Name" }
    - For updates: { "id": "123", "value": "Updated Name" }
    - For archiving: { "id": "123", "archived": true }
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation.

Examples:
  - "Add a new department called 'Product'"
  - "Update location 123 to 'New York Office'"
  - "Archive the old department option"`,
      inputSchema: z.object({
        list_field_id: z.string().describe('List field ID'),
        options: z.array(z.object({
          id: z.string().optional().describe('Option ID (required for updates)'),
          value: z.string().optional().describe('Option value'),
          archived: z.boolean().optional().describe('Set to true to archive')
        })).describe('Array of option objects'),
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
      list_field_id: string;
      options: Array<{ id?: string; value?: string; archived?: boolean }>;
      response_format: ResponseFormat
    }) => {
      try {
        await client.put(`/meta/lists/${params.list_field_id}`, { options: params.options });

        const message = `Successfully updated list field "${params.list_field_id}" with ${params.options.length} option(s)`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              list_field_id: params.list_field_id,
              options_count: params.options.length
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
