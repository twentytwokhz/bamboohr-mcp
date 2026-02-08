// Report and Dataset schemas for BambooHR API
// Covers Custom Reports API and Datasets API

import { z } from 'zod';
import { ResponseFormatSchema, PaginationSchema } from './common.js';

// ===== Custom Reports Schemas =====

export const ListReportsSchema = z.object({
  page: z.number()
    .int()
    .min(1)
    .optional()
    .describe('Page number to retrieve (default: 1)'),
  page_size: z.number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe('Number of records per page (default: 500, max: 1000)'),
  response_format: ResponseFormatSchema
}).strict();

export type ListReportsInput = z.infer<typeof ListReportsSchema>;

export const GetReportByIdSchema = z.object({
  report_id: z.string()
    .describe('Report ID (from bamboohr_list_reports)'),
  format: z.enum(['json', 'csv', 'xml', 'pdf', 'xls'])
    .default('json')
    .describe('Output format for the report data'),
  response_format: ResponseFormatSchema
}).strict();

export type GetReportByIdInput = z.infer<typeof GetReportByIdSchema>;

// ===== Datasets API Schemas =====

export const ListDatasetsSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

export type ListDatasetsInput = z.infer<typeof ListDatasetsSchema>;

export const GetDatasetFieldsSchema = z.object({
  dataset_name: z.string()
    .describe('Dataset name (e.g., "employees", "time_tracking") from bamboohr_list_datasets'),
  page: z.number()
    .int()
    .min(1)
    .optional()
    .describe('Page number to retrieve'),
  page_size: z.number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe('Number of records per page (default: 500, max: 1000)'),
  response_format: ResponseFormatSchema
}).strict();

export type GetDatasetFieldsInput = z.infer<typeof GetDatasetFieldsSchema>;

export const GetFieldOptionsSchema = z.object({
  dataset_name: z.string()
    .describe('Dataset name (e.g., "employees")'),
  fields: z.array(z.string())
    .min(1)
    .describe('Array of field names to get options for'),
  filters: z.array(z.object({
    field: z.string().describe('Field name to filter on'),
    operator: z.string().describe('Filter operator (e.g., "equal", "includes")'),
    value: z.any().describe('Filter value')
  })).optional()
    .describe('Optional filters to narrow down options'),
  response_format: ResponseFormatSchema
}).strict();

export type GetFieldOptionsInput = z.infer<typeof GetFieldOptionsSchema>;

// Filter operators by field type (for documentation)
export const FILTER_OPERATORS = {
  text: ['contains', 'does_not_contain', 'equal', 'not_equal', 'empty', 'not_empty'],
  date: ['lt', 'lte', 'gt', 'gte', 'last', 'next', 'range', 'equal', 'not_equal', 'empty', 'not_empty'],
  int: ['equal', 'not_equal', 'gte', 'gt', 'lte', 'lt', 'empty', 'not_empty'],
  bool: ['checked', 'not_checked'],
  options: ['includes', 'does_not_include', 'empty', 'not_empty'],
  ssnText: ['empty', 'not_empty']
} as const;

// Aggregation types by field type
export const AGGREGATION_TYPES = {
  text: ['count'],
  date: ['count', 'min', 'max'],
  int: ['count', 'min', 'max', 'sum', 'avg'],
  bool: ['count'],
  options: ['count'],
  ssnText: ['count']
} as const;

export const QueryDatasetSchema = z.object({
  dataset_name: z.string()
    .describe('Dataset name (e.g., "employees", "time_tracking")'),
  fields: z.array(z.string())
    .min(1)
    .describe('Array of field names to include in results'),
  filters: z.array(z.object({
    field: z.string().describe('Field name to filter on'),
    operator: z.string().describe('Filter operator based on field type'),
    value: z.any().describe('Filter value (use array for "includes"/"does_not_include")')
  })).optional()
    .describe('Array of filter conditions'),
  sort_by: z.array(z.object({
    field: z.string().describe('Field name to sort by'),
    sort: z.enum(['asc', 'desc']).describe('Sort direction')
  })).optional()
    .describe('Array of sort conditions (applied in order)'),
  group_by: z.array(z.string())
    .optional()
    .describe('Fields to group by (currently only one field supported)'),
  aggregations: z.array(z.object({
    field: z.string().describe('Field to aggregate'),
    type: z.string().describe('Aggregation type (count, min, max, sum, avg)')
  })).optional()
    .describe('Aggregation operations to apply'),
  show_history: z.array(z.string())
    .optional()
    .describe('Entity names to include historical data for'),
  limit: PaginationSchema.limit,
  offset: PaginationSchema.offset,
  response_format: ResponseFormatSchema
}).strict();

export type QueryDatasetInput = z.infer<typeof QueryDatasetSchema>;

// ===== Request Custom Report Schema (ad-hoc reports) =====

export const RequestCustomReportSchema = z.object({
  title: z.string()
    .optional()
    .describe('Optional title for the report'),
  fields: z.array(z.string())
    .min(1)
    .describe('Array of field IDs/aliases to include (from bamboohr_get_fields)'),
  filters: z.record(z.string(), z.any())
    .optional()
    .describe('Optional filters to apply (field: value pairs)'),
  format: z.enum(['JSON', 'CSV', 'XML', 'PDF', 'XLS'])
    .default('JSON')
    .describe('Output format for the report'),
  response_format: ResponseFormatSchema
}).strict();

export type RequestCustomReportInput = z.infer<typeof RequestCustomReportSchema>;

// ===== Company Information Schema =====

export const GetCompanyInfoSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

export type GetCompanyInfoInput = z.infer<typeof GetCompanyInfoSchema>;
