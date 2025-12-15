// Goals & Performance management tools
// Includes CRUD operations for employee goals and performance tracking

import { z } from 'zod';
import { BambooHRClient } from '../services/bamboohr-client.js';
import { ResponseFormatSchema, EmployeeIdSchema, DateSchema } from '../schemas/common.js';
import { ResponseFormat } from '../constants.js';
import { formatGoal, formatGenericList, formatError, truncateIfNeeded, wrapListResponse } from '../services/formatting.js';

export function registerGoalTools(server: any, client: BambooHRClient): void {

  // ===== READ OPERATIONS =====

  // Get employee goals
  server.registerTool(
    'bamboohr_get_employee_goals',
    {
      title: 'Get Employee Goals',
      description: `Get goals for a specific employee.

Returns all goals assigned to an employee with their progress and status.

Args:
  - employee_id (string): Employee ID (required)
  - status (string): Filter by status - 'in_progress', 'completed', 'on_hold' (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of goal objects with id, title, description, status, progress percentage, due date.

Examples:
  - "Show all goals for employee 123"
  - "Get completed goals for employee 456"`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        status: z.enum(['in_progress', 'completed', 'on_hold']).optional().describe('Filter by goal status'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { employee_id: string; status?: string; response_format: ResponseFormat }) => {
      try {
        const queryParams: Record<string, string> = {};
        if (params.status) queryParams.status = params.status;

        const goals = await client.get<Array<Record<string, unknown>>>(
          `/performance/employees/${params.employee_id}/goals`,
          queryParams
        );

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(goals, 'goals');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(goals, ResponseFormat.MARKDOWN, 'Employee Goals', ['title', 'status', 'percentComplete', 'dueDate']);
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

  // Get specific goal details
  server.registerTool(
    'bamboohr_get_goal',
    {
      title: 'Get Goal Details',
      description: `Get detailed information about a specific goal.

Returns full goal details including description, milestones, comments.

Args:
  - employee_id (string): Employee ID (required)
  - goal_id (string): Goal ID (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Goal object with full details.`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        goal_id: z.string().describe('Goal ID'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { employee_id: string; goal_id: string; response_format: ResponseFormat }) => {
      try {
        const goal = await client.get<Record<string, unknown>>(
          `/performance/employees/${params.employee_id}/goals/${params.goal_id}`
        );

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(goal, null, 2) }]
          };
        }

        const formatted = formatGoal(goal, ResponseFormat.MARKDOWN);
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

  // Get goal comments
  server.registerTool(
    'bamboohr_get_goal_comments',
    {
      title: 'Get Goal Comments',
      description: `Get comments/updates on a specific goal.

Returns all comments and progress updates for a goal.

Args:
  - employee_id (string): Employee ID (required)
  - goal_id (string): Goal ID (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of comment objects.`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        goal_id: z.string().describe('Goal ID'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { employee_id: string; goal_id: string; response_format: ResponseFormat }) => {
      try {
        const comments = await client.get<Array<Record<string, unknown>>>(
          `/performance/employees/${params.employee_id}/goals/${params.goal_id}/comments`
        );

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(comments, 'comments');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(comments, ResponseFormat.MARKDOWN, 'Goal Comments', ['text', 'authorName', 'createdDate']);
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

  // Create goal
  server.registerTool(
    'bamboohr_create_goal',
    {
      title: 'Create Goal',
      description: `Create a new goal for an employee.

Creates a goal with specified details including title, description, and due date.

Args:
  - employee_id (string): Employee ID (required)
  - title (string): Goal title (required)
  - description (string): Goal description (optional)
  - due_date (string): Due date in YYYY-MM-DD format (optional)
  - percent_complete (number): Initial progress percentage 0-100 (optional, defaults to 0)
  - shared_with_employee (boolean): Whether employee can see this goal (optional, defaults to true)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Created goal with ID.

Examples:
  - "Create a goal for employee 123 to complete certification by Q2"
  - "Add a professional development goal for employee 456"`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        title: z.string().describe('Goal title'),
        description: z.string().optional().describe('Goal description'),
        due_date: DateSchema.optional().describe('Due date (YYYY-MM-DD)'),
        percent_complete: z.number().min(0).max(100).optional().default(0).describe('Initial progress percentage'),
        shared_with_employee: z.boolean().optional().default(true).describe('Whether employee can see this goal'),
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
      title: string;
      description?: string;
      due_date?: string;
      percent_complete?: number;
      shared_with_employee?: boolean;
      response_format: ResponseFormat
    }) => {
      try {
        const goalData = {
          title: params.title,
          ...(params.description && { description: params.description }),
          ...(params.due_date && { dueDate: params.due_date }),
          percentComplete: params.percent_complete || 0,
          sharedWithEmployee: params.shared_with_employee !== false
        };

        const result = await client.post<{ id?: string }>(
          `/performance/employees/${params.employee_id}/goals`,
          goalData
        );

        const goalId = result?.id || 'created';
        const message = `Successfully created goal "${params.title}" for employee ${params.employee_id}. Goal ID: ${goalId}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              goal_id: goalId,
              employee_id: params.employee_id,
              title: params.title
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

  // Update goal
  server.registerTool(
    'bamboohr_update_goal',
    {
      title: 'Update Goal',
      description: `Update an existing goal.

Modifies goal details like title, description, progress, or status.

Args:
  - employee_id (string): Employee ID (required)
  - goal_id (string): Goal ID to update (required)
  - title (string): New title (optional)
  - description (string): New description (optional)
  - due_date (string): New due date (YYYY-MM-DD) (optional)
  - percent_complete (number): Progress percentage 0-100 (optional)
  - status (string): Goal status - 'in_progress', 'completed', 'on_hold' (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation.

Examples:
  - "Update goal 789 progress to 50%"
  - "Mark goal 456 as completed"
  - "Change the due date for goal 123"`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        goal_id: z.string().describe('Goal ID to update'),
        title: z.string().optional().describe('New title'),
        description: z.string().optional().describe('New description'),
        due_date: DateSchema.optional().describe('New due date'),
        percent_complete: z.number().min(0).max(100).optional().describe('Progress percentage'),
        status: z.enum(['in_progress', 'completed', 'on_hold']).optional().describe('Goal status'),
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
      goal_id: string;
      title?: string;
      description?: string;
      due_date?: string;
      percent_complete?: number;
      status?: string;
      response_format: ResponseFormat
    }) => {
      try {
        const updateData: Record<string, unknown> = {};
        if (params.title) updateData.title = params.title;
        if (params.description) updateData.description = params.description;
        if (params.due_date) updateData.dueDate = params.due_date;
        if (params.percent_complete !== undefined) updateData.percentComplete = params.percent_complete;
        if (params.status) updateData.status = params.status;

        if (Object.keys(updateData).length === 0) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: 'No update fields provided. Please specify at least one field to update.' }]
          };
        }

        await client.put(
          `/performance/employees/${params.employee_id}/goals/${params.goal_id}`,
          updateData
        );

        const updatedFields = Object.keys(updateData).join(', ');
        const message = `Successfully updated goal ${params.goal_id}. Updated fields: ${updatedFields}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              goal_id: params.goal_id,
              employee_id: params.employee_id,
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

  // Delete goal (DESTRUCTIVE - requires confirmation)
  server.registerTool(
    'bamboohr_delete_goal',
    {
      title: 'Delete Goal',
      description: `Delete a goal from an employee's record.

**⚠️ DESTRUCTIVE OPERATION:** This permanently removes the goal. Requires explicit confirmation.

Args:
  - employee_id (string): Employee ID (required)
  - goal_id (string): Goal ID to delete (required)
  - confirm (boolean): Must be set to true to confirm deletion (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation.

Examples:
  - "Delete goal 789 for employee 123"

Error Handling:
  - Returns error if confirm is not true
  - Returns "Resource not found" if goal doesn't exist (404)
  - Returns "Access forbidden" if user lacks permission (403)`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        goal_id: z.string().describe('Goal ID to delete'),
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
    async (params: {
      employee_id: string;
      goal_id: string;
      confirm: boolean;
      response_format: ResponseFormat
    }) => {
      try {
        // Safety check
        if (!params.confirm) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: 'Safety confirmation required. Set confirm: true to permanently delete this goal. This action cannot be undone.' }]
          };
        }

        await client.delete(`/performance/employees/${params.employee_id}/goals/${params.goal_id}`);

        const message = `Successfully deleted goal ${params.goal_id} for employee ${params.employee_id}.`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              deleted_goal_id: params.goal_id,
              employee_id: params.employee_id
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

  // Add goal comment
  server.registerTool(
    'bamboohr_add_goal_comment',
    {
      title: 'Add Goal Comment',
      description: `Add a comment or progress update to a goal.

Posts a comment to track progress, provide feedback, or document updates.

Args:
  - employee_id (string): Employee ID (required)
  - goal_id (string): Goal ID (required)
  - comment (string): Comment text (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation.

Examples:
  - "Add a progress update to goal 456"
  - "Comment on employee 123's certification goal"`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        goal_id: z.string().describe('Goal ID'),
        comment: z.string().describe('Comment text'),
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
      goal_id: string;
      comment: string;
      response_format: ResponseFormat
    }) => {
      try {
        await client.post(
          `/performance/employees/${params.employee_id}/goals/${params.goal_id}/comments`,
          { text: params.comment }
        );

        const message = `Successfully added comment to goal ${params.goal_id}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              goal_id: params.goal_id,
              employee_id: params.employee_id
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
