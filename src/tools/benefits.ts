// Benefits & Dependents management tools
// Includes employee dependents and benefits enrollment

import { z } from 'zod';
import { BambooHRClient } from '../services/bamboohr-client.js';
import { ResponseFormatSchema, EmployeeIdSchema, DateSchema } from '../schemas/common.js';
import { ResponseFormat } from '../constants.js';
import { formatGenericList, formatError, wrapListResponse } from '../services/formatting.js';

export function registerBenefitsTools(server: any, client: BambooHRClient): void {

  // ===== DEPENDENTS READ OPERATIONS =====

  // Get employee dependents
  server.registerTool(
    'bamboohr_get_employee_dependents',
    {
      title: 'Get Employee Dependents',
      description: `Get dependents/family members for an employee.

Returns all dependents associated with an employee including names, relationships, and dates of birth.

Args:
  - employee_id (string): Employee ID (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of dependent objects with firstName, lastName, relationship, dateOfBirth.

Examples:
  - "Show dependents for employee 123"
  - "List family members for employee 456"`,
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
        const dependents = await client.get<Array<Record<string, unknown>>>(
          `/employees/${params.employee_id}/dependents`
        );

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(dependents, 'dependents');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(dependents, ResponseFormat.MARKDOWN, 'Employee Dependents', ['firstName', 'lastName', 'relationship', 'dateOfBirth']);
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

  // Get all employee dependents (company-wide)
  server.registerTool(
    'bamboohr_get_all_dependents',
    {
      title: 'Get All Employee Dependents',
      description: `Get dependents for all employees (company-wide).

Returns all dependents across the organization for benefits administration.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of dependent objects with employee information.

Examples:
  - "List all dependents in the company"
  - "Get dependent count for benefits planning"`,
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
        const dependents = await client.get<Array<Record<string, unknown>>>('/employeedependents');

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(dependents, 'dependents');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(dependents, ResponseFormat.MARKDOWN, 'All Employee Dependents', ['employeeId', 'firstName', 'lastName', 'relationship']);
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

  // ===== DEPENDENTS WRITE OPERATIONS =====

  // Add employee dependent
  server.registerTool(
    'bamboohr_add_employee_dependent',
    {
      title: 'Add Employee Dependent',
      description: `Add a dependent/family member to an employee's record.

Records a new dependent for benefits enrollment.

Args:
  - employee_id (string): Employee ID (required)
  - first_name (string): Dependent's first name (required)
  - last_name (string): Dependent's last name (required)
  - relationship (string): Relationship to employee - 'spouse', 'child', 'domestic partner', etc. (required)
  - date_of_birth (string): Date of birth (YYYY-MM-DD) (required)
  - gender (string): Gender - 'male', 'female' (optional)
  - ssn (string): Social Security Number (optional, for US employees)
  - address_same_as_employee (boolean): Whether dependent has same address (optional, defaults to true)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation with dependent ID.

Examples:
  - "Add spouse for employee 123"
  - "Record a new child dependent for employee 456"`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        first_name: z.string().describe('Dependent first name'),
        last_name: z.string().describe('Dependent last name'),
        relationship: z.string().describe('Relationship (spouse, child, domestic partner, etc.)'),
        date_of_birth: DateSchema.describe('Date of birth'),
        gender: z.enum(['male', 'female']).optional().describe('Gender'),
        ssn: z.string().optional().describe('Social Security Number'),
        address_same_as_employee: z.boolean().optional().default(true).describe('Same address as employee'),
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
      first_name: string;
      last_name: string;
      relationship: string;
      date_of_birth: string;
      gender?: string;
      ssn?: string;
      address_same_as_employee?: boolean;
      response_format: ResponseFormat
    }) => {
      try {
        const dependentData = {
          firstName: params.first_name,
          lastName: params.last_name,
          relationship: params.relationship,
          dateOfBirth: params.date_of_birth,
          ...(params.gender && { gender: params.gender }),
          ...(params.ssn && { ssn: params.ssn }),
          addressSameAsEmployee: params.address_same_as_employee !== false
        };

        const result = await client.post<{ id?: string }>(
          `/employees/${params.employee_id}/dependents`,
          dependentData
        );

        const dependentId = result?.id || 'created';
        const message = `Successfully added dependent ${params.first_name} ${params.last_name} (${params.relationship}) for employee ${params.employee_id}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              dependent_id: dependentId,
              employee_id: params.employee_id,
              name: `${params.first_name} ${params.last_name}`,
              relationship: params.relationship
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

  // Update employee dependent
  server.registerTool(
    'bamboohr_update_employee_dependent',
    {
      title: 'Update Employee Dependent',
      description: `Update information for an employee's dependent.

Modifies dependent details like name, relationship, or contact information.

Args:
  - employee_id (string): Employee ID (required)
  - dependent_id (string): Dependent ID to update (required)
  - first_name (string): Updated first name (optional)
  - last_name (string): Updated last name (optional)
  - relationship (string): Updated relationship (optional)
  - date_of_birth (string): Updated date of birth (YYYY-MM-DD) (optional)
  - gender (string): Updated gender (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation.

Examples:
  - "Update dependent 789's last name for employee 123"
  - "Correct date of birth for dependent 456"`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        dependent_id: z.string().describe('Dependent ID to update'),
        first_name: z.string().optional().describe('Updated first name'),
        last_name: z.string().optional().describe('Updated last name'),
        relationship: z.string().optional().describe('Updated relationship'),
        date_of_birth: DateSchema.optional().describe('Updated date of birth'),
        gender: z.enum(['male', 'female']).optional().describe('Updated gender'),
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
      dependent_id: string;
      first_name?: string;
      last_name?: string;
      relationship?: string;
      date_of_birth?: string;
      gender?: string;
      response_format: ResponseFormat
    }) => {
      try {
        const updateData: Record<string, unknown> = {};
        if (params.first_name) updateData.firstName = params.first_name;
        if (params.last_name) updateData.lastName = params.last_name;
        if (params.relationship) updateData.relationship = params.relationship;
        if (params.date_of_birth) updateData.dateOfBirth = params.date_of_birth;
        if (params.gender) updateData.gender = params.gender;

        if (Object.keys(updateData).length === 0) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: 'No update fields provided. Please specify at least one field to update.' }]
          };
        }

        await client.put(
          `/employees/${params.employee_id}/dependents/${params.dependent_id}`,
          updateData
        );

        const message = `Successfully updated dependent ${params.dependent_id} for employee ${params.employee_id}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              dependent_id: params.dependent_id,
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

  // ===== BENEFITS READ OPERATIONS =====

  // Get benefit plans
  server.registerTool(
    'bamboohr_get_benefit_plans',
    {
      title: 'Get Benefit Plans',
      description: `Get available benefit plans in the system.

Returns configured benefit plans (medical, dental, vision, etc.).

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of benefit plan objects.`,
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
        const plans = await client.get<Array<Record<string, unknown>>>('/benefits/plans');

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(plans, 'benefit_plans');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(plans, ResponseFormat.MARKDOWN, 'Benefit Plans', ['id', 'name', 'type']);
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

  // Get employee benefit enrollments
  server.registerTool(
    'bamboohr_get_employee_benefits',
    {
      title: 'Get Employee Benefits',
      description: `Get benefit enrollments for a specific employee.

Returns the employee's current benefit plan enrollments.

Args:
  - employee_id (string): Employee ID (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of benefit enrollment objects.

Examples:
  - "Show benefits for employee 123"
  - "What plans is employee 456 enrolled in?"`,
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
        const benefits = await client.get<Array<Record<string, unknown>>>(
          `/employees/${params.employee_id}/benefits`
        );

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(benefits, 'benefits');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(benefits, ResponseFormat.MARKDOWN, 'Employee Benefits', ['planName', 'coverageLevel', 'startDate', 'status']);
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

  // Get benefit coverage levels
  server.registerTool(
    'bamboohr_get_benefit_coverage_levels',
    {
      title: 'Get Benefit Coverage Levels',
      description: `Get available coverage levels for a benefit plan.

Returns coverage options (employee only, employee + spouse, family, etc.).

Args:
  - plan_id (string): Benefit plan ID (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of coverage level objects.`,
      inputSchema: z.object({
        plan_id: z.string().describe('Benefit plan ID'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { plan_id: string; response_format: ResponseFormat }) => {
      try {
        const levels = await client.get<Array<Record<string, unknown>>>(
          `/benefits/plans/${params.plan_id}/coverage_levels`
        );

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(levels, 'coverage_levels');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(levels, ResponseFormat.MARKDOWN, 'Coverage Levels', ['id', 'name', 'cost']);
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
