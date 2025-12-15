// File management tools - Upload, delete, and manage employee and company files
// Includes destructive operations with safety confirmations

import { z } from 'zod';
import { BambooHRClient } from '../services/bamboohr-client.js';
import { ResponseFormatSchema, EmployeeIdSchema } from '../schemas/common.js';
import { ResponseFormat } from '../constants.js';
import { formatGenericList, formatError, wrapListResponse } from '../services/formatting.js';

export function registerFileTools(server: any, client: BambooHRClient): void {

  // ===== READ OPERATIONS =====

  // Get employee files (list)
  server.registerTool(
    'bamboohr_list_employee_files',
    {
      title: 'List Employee Files',
      description: `Get a list of files associated with an employee.

Returns all files uploaded to an employee's profile, organized by category.

Args:
  - employee_id (string): Employee ID (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of file objects with id, name, category, dateCreated.`,
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
        const files = await client.get<Array<Record<string, unknown>>>(`/employees/${params.employee_id}/files/view`);

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(files, 'files');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(files, ResponseFormat.MARKDOWN, 'Employee Files', ['id', 'name', 'category', 'dateCreated']);
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

  // Get company files (list)
  server.registerTool(
    'bamboohr_list_company_files',
    {
      title: 'List Company Files',
      description: `Get a list of all company files and folders.

Returns files available in the company files section.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of file and folder objects with names, IDs, and metadata.`,
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
        const files = await client.get<Array<Record<string, unknown>>>('/files/view');

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(files, 'files');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(files, ResponseFormat.MARKDOWN, 'Company Files', ['id', 'name', 'size', 'dateCreated']);
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

  // Get file categories
  server.registerTool(
    'bamboohr_get_file_categories',
    {
      title: 'Get File Categories',
      description: `Get available file categories for employee files.

Returns the list of file categories that can be used when uploading files.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of category objects with id and name.`,
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
        const categories = await client.get<Array<Record<string, unknown>>>('/employees/files/categories');

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(categories, 'categories');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(categories, ResponseFormat.MARKDOWN, 'File Categories', ['id', 'name']);
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

  // Upload employee file
  server.registerTool(
    'bamboohr_upload_employee_file',
    {
      title: 'Upload Employee File',
      description: `Upload a file to an employee's profile.

Uploads a document (PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, TXT, etc.) to an employee's file folder.

Args:
  - employee_id (string): Employee ID (required)
  - file_name (string): Name of the file including extension (required)
  - file_data (string): Base64-encoded file content (required)
  - category_id (string): File category ID (use bamboohr_get_file_categories to see options) (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation with file ID.

Examples:
  - "Upload employee 123's signed offer letter"
  - "Add a PDF certification to employee 456's file"

Error Handling:
  - Returns "Access forbidden" if user lacks permission (403)
  - Returns validation error if file type not allowed`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        file_name: z.string().describe('File name with extension (e.g., "offer_letter.pdf")'),
        file_data: z.string().describe('Base64-encoded file content'),
        category_id: z.string().optional().describe('File category ID'),
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
      file_name: string;
      file_data: string;
      category_id?: string;
      response_format: ResponseFormat
    }) => {
      try {
        const result = await client.uploadFile(
          `/employees/${params.employee_id}/files`,
          params.file_data,
          params.file_name,
          params.category_id
        );

        const fileId = result.id || 'uploaded';
        const message = `Successfully uploaded file "${params.file_name}" for employee ${params.employee_id}. File ID: ${fileId}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              file_id: fileId,
              employee_id: params.employee_id,
              file_name: params.file_name
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

  // Delete employee file (DESTRUCTIVE - requires confirmation)
  server.registerTool(
    'bamboohr_delete_employee_file',
    {
      title: 'Delete Employee File',
      description: `Delete a file from an employee's profile.

**⚠️ DESTRUCTIVE OPERATION:** This permanently removes the file. Requires explicit confirmation.

Args:
  - employee_id (string): Employee ID (required)
  - file_id (string): File ID to delete (required)
  - confirm (boolean): Must be set to true to confirm deletion (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation.

Examples:
  - "Delete file 789 from employee 123's profile"

Error Handling:
  - Returns error if confirm is not true
  - Returns "Resource not found" if file doesn't exist (404)
  - Returns "Access forbidden" if user lacks permission (403)`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        file_id: z.string().describe('File ID to delete'),
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
      file_id: string;
      confirm: boolean;
      response_format: ResponseFormat
    }) => {
      try {
        // Safety check
        if (!params.confirm) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: 'Safety confirmation required. Set confirm: true to permanently delete this file. This action cannot be undone.' }]
          };
        }

        await client.delete(`/employees/${params.employee_id}/files/${params.file_id}`);

        const message = `Successfully deleted file ${params.file_id} from employee ${params.employee_id}'s profile.`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              deleted_file_id: params.file_id,
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

  // Upload employee photo
  server.registerTool(
    'bamboohr_upload_employee_photo',
    {
      title: 'Upload Employee Photo',
      description: `Upload a profile photo for an employee.

Uploads a photo (JPEG or PNG) for an employee's profile picture.

Args:
  - employee_id (string): Employee ID (required)
  - photo_data (string): Base64-encoded photo data (JPEG or PNG) (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation.

Examples:
  - "Upload a new profile photo for employee 123"

Error Handling:
  - Returns "Access forbidden" if user lacks permission (403)
  - Returns validation error if image format not supported`,
      inputSchema: z.object({
        employee_id: EmployeeIdSchema,
        photo_data: z.string().describe('Base64-encoded photo data (JPEG or PNG)'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,  // Uploading same photo is idempotent
        openWorldHint: true
      }
    },
    async (params: {
      employee_id: string;
      photo_data: string;
      response_format: ResponseFormat
    }) => {
      try {
        await client.uploadPhoto(`/employees/${params.employee_id}/photo`, params.photo_data);

        const message = `Successfully uploaded profile photo for employee ${params.employee_id}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
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

  // Upload company file
  server.registerTool(
    'bamboohr_upload_company_file',
    {
      title: 'Upload Company File',
      description: `Upload a file to the company files section.

Uploads a document to company-wide file storage.

Args:
  - file_name (string): Name of the file including extension (required)
  - file_data (string): Base64-encoded file content (required)
  - folder_id (string): Folder ID to upload to (optional, defaults to root)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation with file ID.

Examples:
  - "Upload the company handbook PDF"
  - "Add the benefits guide to company files"

Error Handling:
  - Returns "Access forbidden" if user lacks permission (403)`,
      inputSchema: z.object({
        file_name: z.string().describe('File name with extension'),
        file_data: z.string().describe('Base64-encoded file content'),
        folder_id: z.string().optional().describe('Folder ID to upload to'),
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
      file_name: string;
      file_data: string;
      folder_id?: string;
      response_format: ResponseFormat
    }) => {
      try {
        const endpoint = params.folder_id
          ? `/files/${params.folder_id}`
          : '/files';

        const result = await client.uploadFile(endpoint, params.file_data, params.file_name);

        const fileId = result.id || 'uploaded';
        const message = `Successfully uploaded company file "${params.file_name}". File ID: ${fileId}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              file_id: fileId,
              file_name: params.file_name
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
