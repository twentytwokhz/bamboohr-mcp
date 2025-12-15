// Employee management tools - Full CRUD operations
// Includes read, create, update operations for employee data

import { z } from 'zod';
import { BambooHRClient } from '../services/bamboohr-client.js';
import { ResponseFormatSchema, EmployeeIdSchema, FieldsSchema, OnlyCurrentSchema } from '../schemas/common.js';
import { ResponseFormat } from '../constants.js';
import { formatEmployee, formatEmployeeList, formatError, truncateIfNeeded, wrapListResponse } from '../services/formatting.js';
import type { DirectoryEmployee } from '../types.js';

export function registerEmployeeTools(server: any, client: BambooHRClient): void {

  // ===== READ OPERATIONS =====

  // Get employee directory
  server.registerTool(
    'bamboohr_get_employee_directory',
    {
      title: 'Get Employee Directory',
      description: `Retrieve the company employee directory with basic information for all employees.

This returns a simplified list of all employees with their basic details including ID, name, job title, department, and photo URL.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of employee objects with id, displayName, firstName, lastName, jobTitle, department, photoUrl

Examples:
  - "List all employees"
  - "Show me the employee directory"
  - "Find employees in the engineering department"`,
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
        const data = await client.get<{ employees: DirectoryEmployee[] }>('/employees/directory');
        const employees = data.employees || [];

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(employees, 'employees');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatEmployeeList(employees as unknown as Array<Record<string, unknown>>, ResponseFormat.MARKDOWN);
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

  // Get specific employee
  server.registerTool(
    'bamboohr_get_employee',
    {
      title: 'Get Employee Details',
      description: `Get detailed information for a specific employee by ID.

Retrieves comprehensive employee data including personal information, job details, contact info, and custom fields.

Args:
  - employee_id (string): Employee ID (required)
  - fields (array of strings): Specific fields to retrieve. If omitted, returns common fields.
    Available fields include: firstName, lastName, email, jobTitle, department, location, supervisor,
    hireDate, status, dateOfBirth, phone, mobilePhone, address1, city, state, country, etc.
  - only_current (boolean): If true, only returns current values, excluding historical data (default: false)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Employee object with requested fields.

Examples:
  - "Get details for employee 123"
  - "Show me John Doe's contact information"
  - "What is the hire date for employee 456?"`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        fields: FieldsSchema,
        only_current: OnlyCurrentSchema,
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { employee_id: string; fields?: string[]; only_current?: boolean; response_format: ResponseFormat }) => {
      try {
        // Define default fields if none specified
        const fieldsToRequest = params.fields && params.fields.length > 0
          ? params.fields
          : ['firstName', 'lastName', 'email', 'jobTitle', 'department', 'location', 'supervisor', 'hireDate', 'status', 'mobilePhone', 'workPhone'];

        // Use the GET /employees/{id} endpoint with fields query parameter
        // Note: BambooHR supports up to 400 fields per request
        const fieldsParam = fieldsToRequest.join(',');

        try {
          const employee = await client.get<Record<string, unknown>>(`/employees/${params.employee_id}`, { fields: fieldsParam });

          if (!employee || Object.keys(employee).length === 0) {
            return {
              isError: true,
              content: [{ type: 'text' as const, text: `Employee ${params.employee_id} not found or no data returned.` }]
            };
          }

          // Add the employee ID to the response if not already present
          employee.id = employee.id || params.employee_id;

          if (params.response_format === ResponseFormat.JSON) {
            return {
              content: [{ type: 'text' as const, text: JSON.stringify(employee, null, 2) }]
            };
          }

          const formatted = formatEmployee(employee, ResponseFormat.MARKDOWN);
          return {
            content: [{ type: 'text' as const, text: formatted }]
          };
        } catch (apiError: any) {
          // If the GET /employees/{id} fails due to permissions, fall back to directory
          if (apiError.status === 403 || apiError.status === 401) {
            const directoryData = await client.get<{ employees: DirectoryEmployee[] }>('/employees/directory');
            const allEmployees = directoryData.employees || [];
            const baseEmployee = allEmployees.find(emp => String(emp.id) === String(params.employee_id));

            if (!baseEmployee) {
              return {
                isError: true,
                content: [{ type: 'text' as const, text: `Employee ${params.employee_id} not found.` }]
              };
            }

            if (params.response_format === ResponseFormat.JSON) {
              return {
                content: [{ type: 'text' as const, text: JSON.stringify(baseEmployee, null, 2) + '\n\nNote: Limited to directory fields due to API permissions. Use bamboohr_get_employee_enriched for skills and training data.' }]
              };
            }

            const formatted = formatEmployee(baseEmployee as unknown as Record<string, unknown>, ResponseFormat.MARKDOWN);
            return {
              content: [{ type: 'text' as const, text: formatted + '\n\nNote: Limited to directory fields due to API permissions.' }]
            };
          }
          throw apiError;
        }
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // Get employee files
  server.registerTool(
    'bamboohr_get_employee_files',
    {
      title: 'Get Employee Files',
      description: `Get files associated with a specific employee.

Returns all files uploaded to an employee's profile.

Args:
  - employee_id (string): Employee ID
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of employee file objects with id, name, category, dateCreated.`,
      inputSchema: z.object({
        employee_id: z.string().describe('Employee ID'),
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
        const files = await client.get<Array<Record<string, unknown>>>(`/employees/${params.employee_id}/files/view`);

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(files, 'files');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = `# Employee Files\n\nCount: ${files.length} file(s)\n\n${JSON.stringify(files, null, 2)}`;
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

  // Get employee with enriched data (skills, training, certifications)
  server.registerTool(
    'bamboohr_get_employee_enriched',
    {
      title: 'Get Employee with Skills and Training',
      description: `Get employee details enriched with skills, seniority, and training/certification completion data.

This tool automatically includes common skill and training fields along with standard employee information.

Args:
  - employee_id (string): Employee ID (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Employee object with standard fields plus Skills, Seniority, and major training certifications.

Examples:
  - "Get skills and training for employee 204"
  - "Show me employee 120's certifications and skill level"`,
      inputSchema: z.object({
        employee_id: z.string().describe('Employee ID'),
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
        // Define enriched fields to request (skills, seniority, common certifications)
        const enrichedFields = [
          'firstName', 'lastName', 'email', 'jobTitle', 'department', 'location', 'supervisor', 'hireDate', 'status',
          'mobilePhone', 'workPhone',
          'customSeniority1',  // Seniority (alias)
          'Skills',  // Skills field
          'teams',  // Teams (alias)
          'AZ-900: Microsoft Azure Fundamentals - Completed',
          'AZ-104: Microsoft Azure Administrator - Completed',
          'AZ-204: Developing Solutions for Microsoft Azure - Completed',
          'AZ-305: Designing Microsoft Azure Infrastructure Solutions - Completed',
          'AZ-400: Designing and Implementing Microsoft DevOps Solutions - Completed',
          'DP-203: Data Engineering on Microsoft Azure - Completed',
          'DP-300: Administering Microsoft Azure SQL Solutions - Completed',
          'DP-600: Implementing Analytics Solutions Using Microsoft Fabric - Completed',
          'AI-102: Designing and Implementing a Microsoft Azure AI Solution - Completed',
          'PL-300: Microsoft Power BI Data Analyst - Completed',
          'AWS Certified Cloud Practitioner - Completed',
          'AWS Certified Solutions Architect – Associate - Completed',
          'KnowBe4 Security Trainings - Completed',
          'TKW Security ISMS - Completed'
        ];

        // Use the GET /employees/{id} endpoint with fields query parameter
        const fieldsParam = enrichedFields.join(',');

        try {
          const employee = await client.get<Record<string, unknown>>(`/employees/${params.employee_id}`, { fields: fieldsParam });

          if (!employee || Object.keys(employee).length === 0) {
            return {
              isError: true,
              content: [{ type: 'text' as const, text: `Employee ${params.employee_id} not found or no data returned.` }]
            };
          }

          // Add the employee ID to the response if not already present
          employee.id = employee.id || params.employee_id;

          if (params.response_format === ResponseFormat.JSON) {
            return {
              content: [{ type: 'text' as const, text: JSON.stringify(employee, null, 2) }]
            };
          }

          const formatted = formatEmployee(employee, ResponseFormat.MARKDOWN);
          return {
            content: [{ type: 'text' as const, text: formatted }]
          };
        } catch (apiError: any) {
          // If the GET /employees/{id} fails due to permissions, fall back to directory
          if (apiError.status === 403 || apiError.status === 401) {
            const directoryData = await client.get<{ employees: DirectoryEmployee[] }>('/employees/directory');
            const allEmployees = directoryData.employees || [];
            const baseEmployee = allEmployees.find(emp => String(emp.id) === String(params.employee_id));

            if (!baseEmployee) {
              return {
                isError: true,
                content: [{ type: 'text' as const, text: `Employee ${params.employee_id} not found.` }]
              };
            }

            if (params.response_format === ResponseFormat.JSON) {
              return {
                content: [{ type: 'text' as const, text: JSON.stringify(baseEmployee, null, 2) + '\n\nNote: Limited to directory fields due to API permissions. Skills and training data could not be retrieved.' }]
              };
            }

            const formatted = formatEmployee(baseEmployee as unknown as Record<string, unknown>, ResponseFormat.MARKDOWN);
            return {
              content: [{ type: 'text' as const, text: formatted + '\n\nNote: Limited to directory fields due to API permissions.' }]
            };
          }
          throw apiError;
        }
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // Get employee table data (job history, compensation, etc.)
  server.registerTool(
    'bamboohr_get_employee_table_rows',
    {
      title: 'Get Employee Table/History Data',
      description: `Get table data for an employee (e.g., job history, compensation history).

Retrieves historical or multi-row data from employee tables like jobInfo, compensation, employmentStatus.

Args:
  - employee_id (string): Employee ID
  - table_name (string): Table name (e.g., 'jobInfo', 'compensation', 'employmentStatus')
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of table rows with historical data.

Examples:
  - "Show compensation history for employee 123"
  - "Get job title changes for employee 456"`,
      inputSchema: z.object({
        employee_id: z.string().describe('Employee ID'),
        table_name: z.string().describe('Table name (jobInfo, compensation, employmentStatus, etc.)'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { employee_id: string; table_name: string; response_format: ResponseFormat }) => {
      try {
        const rows = await client.get<Array<Record<string, unknown>>>(`/employees/${params.employee_id}/tables/${params.table_name}`);

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(rows, 'rows');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = `# ${params.table_name} History\n\nCount: ${rows.length} record(s)\n\n${JSON.stringify(rows, null, 2)}`;
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

  // Create employee
  server.registerTool(
    'bamboohr_create_employee',
    {
      title: 'Create New Employee',
      description: `Create a new employee record in BambooHR.

Creates a new employee with the provided information. Required fields typically include firstName and lastName at minimum.

Args:
  - first_name (string): Employee's first name (required)
  - last_name (string): Employee's last name (required)
  - email (string): Employee's email address (optional)
  - hire_date (string): Hire date in YYYY-MM-DD format (optional)
  - job_title (string): Job title (optional)
  - department (string): Department name (optional)
  - location (string): Work location (optional)
  - additional_fields (object): Any additional fields to set (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Created employee information including the new employee ID.

Examples:
  - "Add a new employee named Jane Smith"
  - "Create employee record for new hire starting January 15th"

Error Handling:
  - Returns validation errors if required fields are missing
  - Returns "Access forbidden" if user lacks permission to create employees (403)`,
      inputSchema: z.object({
        first_name: z.string().describe('Employee first name'),
        last_name: z.string().describe('Employee last name'),
        email: z.string().email().optional().describe('Employee email address'),
        hire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Hire date (YYYY-MM-DD)'),
        job_title: z.string().optional().describe('Job title'),
        department: z.string().optional().describe('Department'),
        location: z.string().optional().describe('Work location'),
        additional_fields: z.record(z.string(), z.unknown()).optional().describe('Additional fields to set'),
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
      first_name: string;
      last_name: string;
      email?: string;
      hire_date?: string;
      job_title?: string;
      department?: string;
      location?: string;
      additional_fields?: Record<string, unknown>;
      response_format: ResponseFormat
    }) => {
      try {
        const employeeData: Record<string, unknown> = {
          firstName: params.first_name,
          lastName: params.last_name,
          ...(params.email && { email: params.email }),
          ...(params.hire_date && { hireDate: params.hire_date }),
          ...(params.job_title && { jobTitle: params.job_title }),
          ...(params.department && { department: params.department }),
          ...(params.location && { location: params.location }),
          ...(params.additional_fields && params.additional_fields)
        };

        const result = await client.post<{ id: string; location?: string }>('/employees', employeeData);

        // BambooHR returns the new employee ID in the Location header or response
        const employeeId = result.id || (result.location ? result.location.split('/').pop() : 'unknown');
        const message = `Successfully created employee with ID: ${employeeId}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ id: employeeId, ...employeeData }, null, 2) }]
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

  // Update employee
  server.registerTool(
    'bamboohr_update_employee',
    {
      title: 'Update Employee Information',
      description: `Update employee information for a specific employee.

Allows updating various employee fields including personal information, job details, and custom fields.
Only updates the fields provided - existing fields not included will remain unchanged.

Args:
  - employee_id (string): Employee ID to update (required)
  - update_data (object): Fields to update with their new values (required)
    Example: {"firstName": "John", "lastName": "Doe", "email": "john@example.com", "customField123": "value"}
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Common updatable fields:
  - firstName, lastName, email
  - jobTitle, department, location
  - supervisor, hireDate, status
  - Any custom fields by their field name/ID

Returns:
  Success confirmation or error message.

Examples:
  - "Update employee 123's email to newemail@company.com"
  - "Change John's job title to Senior Developer"
  - "Update custom field 'Skills' for employee 456"

Error Handling:
  - Returns "Resource not found" if employee doesn't exist (404)
  - Returns "Access forbidden" if user lacks permission to update (403)
  - Returns field-specific errors if validation fails`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        update_data: z.record(z.string(), z.unknown()).describe('Object containing fields to update'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,  // PUT updates are idempotent
        openWorldHint: true
      }
    },
    async (params: { employee_id: string; update_data: Record<string, unknown>; response_format: ResponseFormat }) => {
      try {
        await client.post(`/employees/${params.employee_id}`, params.update_data);

        const updatedFields = Object.keys(params.update_data).join(', ');
        const message = `Successfully updated employee ${params.employee_id}. Updated fields: ${updatedFields}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              employee_id: params.employee_id,
              updated_fields: Object.keys(params.update_data)
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

  // Add employee table row
  server.registerTool(
    'bamboohr_add_employee_table_row',
    {
      title: 'Add Employee Table Row',
      description: `Add a new row to an employee table (e.g., job history, compensation, employment status).

Adds historical data like a new job title change, compensation update, or employment status change.

Common table names:
  - jobInfo: Job title, department, location, supervisor changes
  - compensation: Pay rate, pay type, pay frequency changes
  - employmentStatus: Status changes (active, terminated, leave, etc.)
  - customTable: Custom table data

Args:
  - employee_id (string): Employee ID (required)
  - table_name (string): Table name to add row to (required)
  - row_data (object): Row data as key-value pairs (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Example row_data for jobInfo:
  {"date": "2024-01-01", "jobTitle": "Senior Engineer", "department": "Engineering"}

Example row_data for compensation:
  {"date": "2024-01-01", "rate": "85000", "type": "Salary", "frequency": "Annual"}

Returns:
  Success confirmation with new row ID.

Examples:
  - "Add a promotion to Senior Engineer for employee 123 effective Jan 1"
  - "Record a salary increase for employee 456"`,
      inputSchema: z.object({
        employee_id: z.string().describe('Employee ID'),
        table_name: z.string().describe('Table name (jobInfo, compensation, employmentStatus, etc.)'),
        row_data: z.record(z.string(), z.unknown()).describe('Row data to add'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,  // POST creates are not idempotent
        openWorldHint: true
      }
    },
    async (params: { employee_id: string; table_name: string; row_data: Record<string, unknown>; response_format: ResponseFormat }) => {
      try {
        const result = await client.post<{ id?: string }>(`/employees/${params.employee_id}/tables/${params.table_name}`, params.row_data);

        const rowId = result?.id || 'created';
        const message = `Successfully added row to ${params.table_name} for employee ${params.employee_id}. Row ID: ${rowId}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              employee_id: params.employee_id,
              table_name: params.table_name,
              row_id: rowId
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

  // Update employee table row
  server.registerTool(
    'bamboohr_update_employee_table_row',
    {
      title: 'Update Employee Table Row',
      description: `Update an existing row in an employee table.

Modifies an existing historical record like a job info entry, compensation record, or employment status.

Args:
  - employee_id (string): Employee ID (required)
  - table_name (string): Table name containing the row (required)
  - row_id (string): ID of the row to update (required)
  - row_data (object): Fields to update with new values (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation.

Examples:
  - "Correct the effective date on employee 123's last promotion"
  - "Fix the salary amount in compensation record 789"`,
      inputSchema: z.object({
        employee_id: z.string().describe('Employee ID'),
        table_name: z.string().describe('Table name'),
        row_id: z.string().describe('Row ID to update'),
        row_data: z.record(z.string(), z.unknown()).describe('Fields to update'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,  // PUT updates are idempotent
        openWorldHint: true
      }
    },
    async (params: { employee_id: string; table_name: string; row_id: string; row_data: Record<string, unknown>; response_format: ResponseFormat }) => {
      try {
        await client.post(`/employees/${params.employee_id}/tables/${params.table_name}/${params.row_id}`, params.row_data);

        const message = `Successfully updated row ${params.row_id} in ${params.table_name} for employee ${params.employee_id}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              employee_id: params.employee_id,
              table_name: params.table_name,
              row_id: params.row_id
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
