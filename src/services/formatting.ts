// Formatting utilities for responses

import { CHARACTER_LIMIT, ResponseFormat } from '../constants.js';

/**
 * Wraps list data with count metadata for accurate reporting.
 * This ensures AI assistants can provide precise counts when asked.
 */
export function wrapListResponse<T>(
  items: T[],
  entityName: string,
  additionalMeta?: Record<string, unknown>
): { count: number; [key: string]: unknown } {
  return {
    count: items.length,
    [`${entityName}`]: items,
    ...additionalMeta
  };
}

export function formatEmployee(employee: Record<string, unknown>, format: ResponseFormat): string {
  if (format === ResponseFormat.JSON) {
    return JSON.stringify(employee, null, 2);
  }

  // Markdown format
  const lines: string[] = [];
  lines.push(`# Employee: ${employee.firstName} ${employee.lastName}`);
  lines.push('');
  lines.push(`**ID:** ${employee.id}`);
  
  if (employee.email) lines.push(`**Email:** ${employee.email}`);
  if (employee.jobTitle) lines.push(`**Job Title:** ${employee.jobTitle}`);
  if (employee.department) lines.push(`**Department:** ${employee.department}`);
  if (employee.location) lines.push(`**Location:** ${employee.location}`);
  if (employee.supervisor) lines.push(`**Supervisor:** ${employee.supervisor}`);
  if (employee.hireDate) lines.push(`**Hire Date:** ${employee.hireDate}`);
  if (employee.status) lines.push(`**Status:** ${employee.status}`);

  return lines.join('\n');
}

export function formatEmployeeList(employees: Array<Record<string, unknown>>, format: ResponseFormat): string {
  if (format === ResponseFormat.JSON) {
    return JSON.stringify(employees, null, 2);
  }

  // Markdown format
  const lines: string[] = [];
  lines.push(`# Employees (${employees.length})`);
  lines.push('');

  employees.forEach((emp, index) => {
    lines.push(`## ${index + 1}. ${emp.firstName} ${emp.lastName} (ID: ${emp.id})`);
    if (emp.jobTitle) lines.push(`   - **Job Title:** ${emp.jobTitle}`);
    if (emp.department) lines.push(`   - **Department:** ${emp.department}`);
    if (emp.email) lines.push(`   - **Email:** ${emp.email}`);
    lines.push('');
  });

  return lines.join('\n');
}

export function formatTimeOffRequest(request: Record<string, unknown>, format: ResponseFormat): string {
  if (format === ResponseFormat.JSON) {
    return JSON.stringify(request, null, 2);
  }

  const lines: string[] = [];
  lines.push(`# Time Off Request #${request.id}`);
  lines.push('');
  lines.push(`**Employee ID:** ${request.employeeId}`);
  lines.push(`**Status:** ${request.status}`);
  lines.push(`**Start:** ${request.start}`);
  lines.push(`**End:** ${request.end}`);
  lines.push(`**Amount:** ${request.amount} ${request.type ? `(${(request.type as Record<string, unknown>).name})` : ''}`);

  return lines.join('\n');
}

export function formatTimeOffRequestList(requests: Array<Record<string, unknown>>, format: ResponseFormat): string {
  if (format === ResponseFormat.JSON) {
    return JSON.stringify(requests, null, 2);
  }

  const lines: string[] = [];
  lines.push(`# Time Off Requests (${requests.length})`);
  lines.push('');

  requests.forEach((req, index) => {
    lines.push(`## ${index + 1}. Request #${req.id}`);
    lines.push(`   - **Employee:** ${req.employeeId}`);
    lines.push(`   - **Status:** ${req.status}`);
    lines.push(`   - **Dates:** ${req.start} to ${req.end}`);
    lines.push(`   - **Amount:** ${req.amount}`);
    lines.push('');
  });

  return lines.join('\n');
}

export function formatGoal(goal: Record<string, unknown>, format: ResponseFormat): string {
  if (format === ResponseFormat.JSON) {
    return JSON.stringify(goal, null, 2);
  }

  const lines: string[] = [];
  lines.push(`# Goal: ${goal.title}`);
  lines.push('');
  lines.push(`**ID:** ${goal.id}`);
  lines.push(`**Status:** ${goal.status}`);
  lines.push(`**Progress:** ${goal.percentComplete}%`);
  if (goal.dueDate) lines.push(`**Due Date:** ${goal.dueDate}`);
  if (goal.description) {
    lines.push('');
    lines.push(`**Description:** ${goal.description}`);
  }

  return lines.join('\n');
}

export function formatGenericList(
  items: Array<Record<string, unknown>>,
  format: ResponseFormat,
  title: string,
  displayFields: string[]
): string {
  if (format === ResponseFormat.JSON) {
    return JSON.stringify(items, null, 2);
  }

  const lines: string[] = [];
  lines.push(`# ${title} (${items.length})`);
  lines.push('');

  items.forEach((item, index) => {
    const itemId = item.id || item.name || index + 1;
    lines.push(`## ${index + 1}. ${itemId}`);
    
    displayFields.forEach(field => {
      if (item[field] !== undefined && item[field] !== null) {
        const label = field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
        lines.push(`   - **${label}:** ${item[field]}`);
      }
    });
    lines.push('');
  });

  return lines.join('\n');
}

export function truncateIfNeeded(content: string, limit: number = CHARACTER_LIMIT): string {
  if (content.length <= limit) {
    return content;
  }

  const truncated = content.substring(0, limit);
  return `${truncated}\n\n... [Content truncated. Original length: ${content.length} characters, showing first ${limit} characters]`;
}

export function createPaginationInfo(
  total: number,
  count: number,
  offset: number,
  limit: number
): {
  has_more: boolean;
  next_offset?: number;
  total: number;
  count: number;
  offset: number;
} {
  const has_more = offset + count < total;
  const result: ReturnType<typeof createPaginationInfo> = {
    has_more,
    total,
    count,
    offset
  };

  if (has_more) {
    result.next_offset = offset + limit;
  }

  return result;
}

export function formatError(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as { error?: string; message?: string; status?: number };
    if (apiError.message) {
      return `Error: ${apiError.message}`;
    }
  }
  
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  return `Error: ${String(error)}`;
}
