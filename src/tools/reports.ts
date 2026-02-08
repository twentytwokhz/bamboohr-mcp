// Reports & Datasets tools for BambooHR API
// Provides access to saved reports and raw dataset queries

import { BambooHRClient } from '../services/bamboohr-client.js';
import { ResponseFormat } from '../constants.js';
import { formatError, truncateIfNeeded, wrapListResponse } from '../services/formatting.js';
import {
  ListReportsSchema,
  GetReportByIdSchema,
  ListDatasetsSchema,
  GetDatasetFieldsSchema,
  GetFieldOptionsSchema,
  QueryDatasetSchema,
  RequestCustomReportSchema,
  GetCompanyInfoSchema,
  ListReportsInput,
  GetReportByIdInput,
  ListDatasetsInput,
  GetDatasetFieldsInput,
  GetFieldOptionsInput,
  QueryDatasetInput,
  RequestCustomReportInput,
  GetCompanyInfoInput
} from '../schemas/report-schemas.js';

// Types for API responses
interface Report {
  id: string;
  name: string;
  lastViewed?: string;
  owner?: string;
}

interface ReportsResponse {
  reports?: Report[];
}

interface Dataset {
  name: string;
  label: string;
}

interface DatasetsResponse {
  datasets?: Dataset[];
}

interface DatasetField {
  id: string;
  name: string;
  alias?: string;
  type: string;
  entityName?: string;
  description?: string;
}

interface DatasetFieldsResponse {
  fields?: DatasetField[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
  };
}

interface FieldOption {
  id: string;
  name: string;
  archived?: boolean;
}

interface CompanyInfo {
  name?: string;
  employees?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  timeZone?: string;
}

// Format report for markdown display
function formatReportMarkdown(report: Report): string {
  const lines: string[] = [];
  lines.push(`### ${report.name}`);
  lines.push(`   - **ID:** ${report.id}`);
  if (report.owner) lines.push(`   - **Owner:** ${report.owner}`);
  if (report.lastViewed) lines.push(`   - **Last Viewed:** ${report.lastViewed}`);
  return lines.join('\n');
}

// Format dataset for markdown display
function formatDatasetMarkdown(dataset: Dataset): string {
  return `- **${dataset.label}** (\`${dataset.name}\`)`;
}

// Format field for markdown display
function formatFieldMarkdown(field: DatasetField): string {
  const lines: string[] = [];
  lines.push(`### ${field.name}`);
  lines.push(`   - **ID:** ${field.id}`);
  if (field.alias) lines.push(`   - **Alias:** ${field.alias}`);
  lines.push(`   - **Type:** ${field.type}`);
  if (field.entityName) lines.push(`   - **Entity:** ${field.entityName}`);
  if (field.description) lines.push(`   - **Description:** ${field.description}`);
  return lines.join('\n');
}

export function registerReportTools(server: any, client: BambooHRClient): void {

  // ===== CUSTOM REPORTS (SAVED REPORTS) =====

  // Tool 1: List saved reports
  server.registerTool(
    'bamboohr_list_reports',
    {
      title: 'List Saved Reports',
      description: `List all saved/custom reports in BambooHR.

Returns reports created in BambooHR's Reports section, including custom reports
like "Feedback Status". Use the report ID with bamboohr_run_report to execute.

Args:
  - page (number): Page number (default: 1)
  - page_size (number): Results per page (default: 500, max: 1000)
  - response_format ('json'|'markdown'): Output format

Returns:
  List of reports with ID, name, owner, and last viewed date.

Examples:
  - "List all available reports"
  - "Show me the saved reports in BambooHR"
  - "Find the Feedback Status report"`,
      inputSchema: ListReportsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: ListReportsInput) => {
      try {
        const queryParams: Record<string, string | number> = {};
        if (params.page) queryParams.page = params.page;
        if (params.page_size) queryParams.page_size = params.page_size;

        const result = await client.get<ReportsResponse>('/custom-reports', queryParams);
        const reports = result.reports || [];

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(wrapListResponse(reports, 'reports'), null, 2) }]
          };
        }

        // Markdown format
        const lines: string[] = [];
        lines.push(`# Saved Reports (${reports.length})`);
        lines.push('');

        if (reports.length === 0) {
          lines.push('No saved reports found.');
        } else {
          reports.forEach(report => lines.push(formatReportMarkdown(report)));
        }

        lines.push('');
        lines.push('> Use `bamboohr_run_report` with the report ID to execute a report.');

        return {
          content: [{ type: 'text' as const, text: truncateIfNeeded(lines.join('\n')) }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // Tool 2: Run a saved report by ID
  server.registerTool(
    'bamboohr_run_report',
    {
      title: 'Run Saved Report',
      description: `Execute a saved report by ID and return the data.

Runs a report created in BambooHR's Reports section. Get report IDs from
bamboohr_list_reports. Supports multiple output formats.

Args:
  - report_id (string): Report ID from bamboohr_list_reports (required)
  - format ('json'|'csv'|'xml'|'pdf'|'xls'): Data format (default: 'json')
  - response_format ('json'|'markdown'): Output format

Returns:
  Report data in the requested format.

Examples:
  - "Run the Feedback Status report"
  - "Execute report 123 as CSV"
  - "Get the data from report ID 456"`,
      inputSchema: GetReportByIdSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetReportByIdInput) => {
      try {
        // Use getReport method for format-specific responses
        const result = await client.getReport(
          `/custom-reports/${params.report_id}`,
          params.format as 'json' | 'xml' | 'csv'
        );

        // For non-JSON formats, return raw content
        if (params.format !== 'json') {
          return {
            content: [{ type: 'text' as const, text: String(result) }]
          };
        }

        // JSON format
        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
          };
        }

        // Markdown format - try to format as table
        const data = result as Record<string, unknown>;
        const lines: string[] = [];
        lines.push(`# Report: ${params.report_id}`);
        lines.push('');

        if (Array.isArray(data)) {
          lines.push(`**${data.length} records returned**`);
          lines.push('');
          lines.push('```json');
          lines.push(JSON.stringify(data.slice(0, 10), null, 2));
          if (data.length > 10) {
            lines.push(`\n... and ${data.length - 10} more records`);
          }
          lines.push('```');
        } else if (data.employees && Array.isArray(data.employees)) {
          const employees = data.employees as Record<string, unknown>[];
          lines.push(`**${employees.length} employees returned**`);
          lines.push('');
          lines.push('```json');
          lines.push(JSON.stringify(employees.slice(0, 10), null, 2));
          if (employees.length > 10) {
            lines.push(`\n... and ${employees.length - 10} more records`);
          }
          lines.push('```');
        } else {
          lines.push('```json');
          lines.push(JSON.stringify(data, null, 2));
          lines.push('```');
        }

        return {
          content: [{ type: 'text' as const, text: truncateIfNeeded(lines.join('\n')) }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // ===== DATASETS API =====

  // Tool 3: List available datasets
  server.registerTool(
    'bamboohr_list_datasets',
    {
      title: 'List Datasets',
      description: `List available datasets for querying.

Datasets provide structured access to BambooHR data categories like employees,
time_tracking, etc. Use dataset names with bamboohr_query_dataset.

Args:
  - response_format ('json'|'markdown'): Output format

Returns:
  List of datasets with name and human-readable label.

Examples:
  - "What datasets are available?"
  - "List all data sources I can query"`,
      inputSchema: ListDatasetsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: ListDatasetsInput) => {
      try {
        const result = await client.get<DatasetsResponse>('/datasets');
        const datasets = result.datasets || [];

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(wrapListResponse(datasets, 'datasets'), null, 2) }]
          };
        }

        // Markdown format
        const lines: string[] = [];
        lines.push(`# Available Datasets (${datasets.length})`);
        lines.push('');

        if (datasets.length === 0) {
          lines.push('No datasets found.');
        } else {
          datasets.forEach(ds => lines.push(formatDatasetMarkdown(ds)));
        }

        lines.push('');
        lines.push('> Use `bamboohr_get_dataset_fields` to see available fields for a dataset.');
        lines.push('> Use `bamboohr_query_dataset` to query data from a dataset.');

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // Tool 4: Get fields for a dataset
  server.registerTool(
    'bamboohr_get_dataset_fields',
    {
      title: 'Get Dataset Fields',
      description: `Get available fields for a specific dataset.

Returns field metadata including ID, name, type, and entity name.
Use field names in bamboohr_query_dataset to build queries.

Args:
  - dataset_name (string): Dataset name from bamboohr_list_datasets (required)
  - page (number): Page number for pagination
  - page_size (number): Results per page (max: 1000)
  - response_format ('json'|'markdown'): Output format

Returns:
  List of fields with ID, name, type, and entity information.

Field Types and Operators:
  - text: contains, does_not_contain, equal, not_equal, empty, not_empty
  - date: lt, lte, gt, gte, last, next, range, equal, not_equal, empty, not_empty
  - int: equal, not_equal, gte, gt, lte, lt, empty, not_empty
  - bool: checked, not_checked
  - options: includes, does_not_include, empty, not_empty

Examples:
  - "What fields are available in the employees dataset?"
  - "Show me the time_tracking dataset fields"`,
      inputSchema: GetDatasetFieldsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetDatasetFieldsInput) => {
      try {
        const queryParams: Record<string, string | number> = {};
        if (params.page) queryParams.page = params.page;
        if (params.page_size) queryParams.page_size = params.page_size;

        const result = await client.get<DatasetFieldsResponse>(
          `/datasets/${params.dataset_name}/fields`,
          queryParams
        );
        const fields = result.fields || [];

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              dataset: params.dataset_name,
              fields,
              pagination: result.pagination,
              total: fields.length
            }, null, 2) }]
          };
        }

        // Markdown format
        const lines: string[] = [];
        lines.push(`# Fields for Dataset: ${params.dataset_name} (${fields.length})`);
        lines.push('');

        if (fields.length === 0) {
          lines.push('No fields found for this dataset.');
        } else {
          // Group by type for readability
          const byType: Record<string, DatasetField[]> = {};
          fields.forEach(f => {
            const type = f.type || 'unknown';
            if (!byType[type]) byType[type] = [];
            byType[type].push(f);
          });

          for (const [type, typeFields] of Object.entries(byType)) {
            lines.push(`## ${type} fields (${typeFields.length})`);
            typeFields.forEach(f => lines.push(formatFieldMarkdown(f)));
            lines.push('');
          }
        }

        if (result.pagination) {
          lines.push(`---`);
          lines.push(`Page ${result.pagination.currentPage} of ${result.pagination.totalPages} (${result.pagination.totalRecords} total)`);
        }

        return {
          content: [{ type: 'text' as const, text: truncateIfNeeded(lines.join('\n')) }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // Tool 5: Get field options (possible values)
  server.registerTool(
    'bamboohr_get_field_options',
    {
      title: 'Get Field Options',
      description: `Get possible values for filter fields in a dataset.

Use this to discover valid filter values before querying. Returns option IDs
that should be used with "includes" and "does_not_include" operators.

Args:
  - dataset_name (string): Dataset name (required)
  - fields (string[]): Array of field names to get options for (required)
  - filters (array): Optional filters to narrow down options
  - response_format ('json'|'markdown'): Output format

Returns:
  Field options with ID, name, and archived status.

Examples:
  - "What are the valid status values for employees?"
  - "Get department options for filtering"`,
      inputSchema: GetFieldOptionsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetFieldOptionsInput) => {
      try {
        const requestBody: Record<string, unknown> = {
          fields: params.fields
        };
        if (params.filters) {
          requestBody.filters = params.filters;
        }

        const result = await client.post<FieldOption[] | Record<string, FieldOption[]>>(
          `/datasets/${params.dataset_name}/field-options`,
          requestBody
        );

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              dataset: params.dataset_name,
              fields: params.fields,
              options: result
            }, null, 2) }]
          };
        }

        // Markdown format
        const lines: string[] = [];
        lines.push(`# Field Options for: ${params.dataset_name}`);
        lines.push(`**Fields:** ${params.fields.join(', ')}`);
        lines.push('');

        if (Array.isArray(result)) {
          result.forEach(opt => {
            const archived = opt.archived ? ' _(archived)_' : '';
            lines.push(`- **${opt.name}** (ID: \`${opt.id}\`)${archived}`);
          });
        } else {
          for (const [field, options] of Object.entries(result)) {
            lines.push(`## ${field}`);
            if (Array.isArray(options)) {
              options.forEach(opt => {
                const archived = opt.archived ? ' _(archived)_' : '';
                lines.push(`- **${opt.name}** (ID: \`${opt.id}\`)${archived}`);
              });
            }
            lines.push('');
          }
        }

        lines.push('');
        lines.push('> Use IDs with "includes" or "does_not_include" operators in filters.');

        return {
          content: [{ type: 'text' as const, text: truncateIfNeeded(lines.join('\n')) }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // Tool 6: Query dataset
  server.registerTool(
    'bamboohr_query_dataset',
    {
      title: 'Query Dataset',
      description: `Query data from a BambooHR dataset with filters, sorting, and aggregations.

Powerful API for retrieving filtered, sorted, and aggregated employee data.
Use bamboohr_get_dataset_fields to discover available fields first.

Args:
  - dataset_name (string): Dataset name (required)
  - fields (string[]): Fields to include in results (required)
  - filters (array): Filter conditions with {field, operator, value}
  - sort_by (array): Sort conditions with {field, sort: 'asc'|'desc'}
  - group_by (string[]): Fields to group by (one field supported)
  - aggregations (array): Aggregations with {field, type}
  - show_history (string[]): Entity names to include history for
  - limit (number): Max results (default: 20)
  - offset (number): Skip results for pagination
  - response_format ('json'|'markdown'): Output format

Filter Operators by Type:
  - text: contains, does_not_contain, equal, not_equal, empty, not_empty
  - date: lt, lte, gt, gte, last, next, range, equal, not_equal
  - int: equal, not_equal, gte, gt, lte, lt
  - bool: checked, not_checked
  - options: includes, does_not_include (use arrays: ["value1", "value2"])

Special Filter Values:
  - last/next: {"duration": "5", "unit": "years"} (days, weeks, months, years)
  - range: {"start": "2023-01-01", "end": "2023-12-31"}

Examples:
  - "Get all active employees with their department and job title"
  - "Find employees hired in the last 6 months"
  - "Count employees by department"`,
      inputSchema: QueryDatasetSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: QueryDatasetInput) => {
      try {
        const requestBody: Record<string, unknown> = {
          fields: params.fields
        };

        if (params.filters) requestBody.filters = params.filters;
        if (params.sort_by) requestBody.sortBy = params.sort_by;
        if (params.group_by) requestBody.groupBy = params.group_by;
        if (params.aggregations) requestBody.aggregations = params.aggregations;
        if (params.show_history) requestBody.showHistory = params.show_history;
        if (params.limit) requestBody.limit = params.limit;
        if (params.offset) requestBody.offset = params.offset;

        const result = await client.post<{
          data?: Record<string, unknown>[];
          employees?: Record<string, unknown>[];
          pagination?: { total: number; limit: number; offset: number };
        }>(
          `/datasets/${params.dataset_name}`,
          requestBody
        );

        const data = result.data || result.employees || [];
        const pagination = result.pagination;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              dataset: params.dataset_name,
              query: {
                fields: params.fields,
                filters: params.filters,
                sort_by: params.sort_by,
                group_by: params.group_by,
                aggregations: params.aggregations
              },
              data,
              pagination,
              total: data.length
            }, null, 2) }]
          };
        }

        // Markdown format
        const lines: string[] = [];
        lines.push(`# Query Results: ${params.dataset_name}`);
        lines.push(`**Records:** ${data.length}${pagination ? ` of ${pagination.total}` : ''}`);
        lines.push('');

        if (data.length === 0) {
          lines.push('No records match the query criteria.');
        } else {
          // Show as formatted list
          data.slice(0, 20).forEach((record, idx) => {
            lines.push(`### Record ${idx + 1}`);
            for (const [key, value] of Object.entries(record)) {
              if (value !== null && value !== undefined && value !== '') {
                lines.push(`   - **${key}:** ${value}`);
              }
            }
            lines.push('');
          });

          if (data.length > 20) {
            lines.push(`... and ${data.length - 20} more records`);
          }
        }

        return {
          content: [{ type: 'text' as const, text: truncateIfNeeded(lines.join('\n')) }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // Tool 7: Request custom (ad-hoc) report
  server.registerTool(
    'bamboohr_request_custom_report',
    {
      title: 'Request Custom Report',
      description: `Generate an ad-hoc custom report with specified fields.

Creates a one-time report by specifying which fields to include.
Different from bamboohr_run_report which executes saved reports.

Note: This endpoint is deprecated by BambooHR in favor of the Datasets API.
Use bamboohr_query_dataset for new implementations.

Args:
  - title (string): Optional report title
  - fields (string[]): Field IDs/aliases to include (required)
  - filters (object): Optional field:value filter pairs
  - format ('JSON'|'CSV'|'XML'|'PDF'|'XLS'): Output format
  - response_format ('json'|'markdown'): MCP output format

Returns:
  Report data with requested fields for all matching employees.

Examples:
  - "Generate a report with firstName, lastName, and hireDate"
  - "Create an ad-hoc report of employee contact info"`,
      inputSchema: RequestCustomReportSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: RequestCustomReportInput) => {
      try {
        const requestBody: Record<string, unknown> = {
          fields: params.fields
        };
        if (params.title) requestBody.title = params.title;
        if (params.filters) requestBody.filters = params.filters;

        const result = await client.post<{ employees?: Record<string, unknown>[] }>(
          '/reports/custom',
          requestBody,
          { format: params.format }
        );

        // For non-JSON formats, the response might be raw text
        if (params.format !== 'JSON' && typeof result === 'string') {
          return {
            content: [{ type: 'text' as const, text: result }]
          };
        }

        const employees = result.employees || [];

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              title: params.title || 'Custom Report',
              fields_requested: params.fields,
              employees,
              total: employees.length
            }, null, 2) }]
          };
        }

        // Markdown format
        const lines: string[] = [];
        lines.push(`# ${params.title || 'Custom Report'}`);
        lines.push(`**Employees:** ${employees.length}`);
        lines.push(`**Fields:** ${params.fields.join(', ')}`);
        lines.push('');

        if (employees.length === 0) {
          lines.push('No employees found.');
        } else {
          employees.slice(0, 20).forEach((emp) => {
            const name = emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || `Employee ${emp.id}`;
            lines.push(`### ${name}`);
            for (const [key, value] of Object.entries(emp)) {
              if (value !== null && value !== undefined && value !== '' && key !== 'id') {
                lines.push(`   - **${key}:** ${value}`);
              }
            }
            lines.push('');
          });

          if (employees.length > 20) {
            lines.push(`... and ${employees.length - 20} more employees`);
          }
        }

        return {
          content: [{ type: 'text' as const, text: truncateIfNeeded(lines.join('\n')) }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // Tool 8: Get company information
  server.registerTool(
    'bamboohr_get_company_info',
    {
      title: 'Get Company Information',
      description: `Get company information and metadata.

Returns basic company details like name, address, employee count, and timezone.

Args:
  - response_format ('json'|'markdown'): Output format

Returns:
  Company name, address, phone, timezone, and employee count.

Examples:
  - "What company is this BambooHR account for?"
  - "Get company timezone"`,
      inputSchema: GetCompanyInfoSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetCompanyInfoInput) => {
      try {
        const result = await client.get<CompanyInfo>('/company_information');

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
          };
        }

        // Markdown format
        const lines: string[] = [];
        lines.push(`# Company Information`);
        lines.push('');
        if (result.name) lines.push(`**Name:** ${result.name}`);
        if (result.employees) lines.push(`**Employees:** ${result.employees}`);
        if (result.address) lines.push(`**Address:** ${result.address}`);
        if (result.city || result.state || result.postalCode) {
          lines.push(`**Location:** ${[result.city, result.state, result.postalCode].filter(Boolean).join(', ')}`);
        }
        if (result.country) lines.push(`**Country:** ${result.country}`);
        if (result.phone) lines.push(`**Phone:** ${result.phone}`);
        if (result.timeZone) lines.push(`**Timezone:** ${result.timeZone}`);

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }]
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
