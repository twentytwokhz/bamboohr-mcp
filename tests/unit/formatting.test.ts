import { describe, it, expect } from 'vitest';
import {
  wrapListResponse,
  formatEmployee,
  formatEmployeeList,
  truncateIfNeeded,
  createPaginationInfo
} from '../../src/services/formatting.js';
import { ResponseFormat } from '../../src/constants.js';

describe('wrapListResponse', () => {
  it('should wrap array with count metadata', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = wrapListResponse(items, 'employees');

    expect(result.count).toBe(3);
    expect(result.employees).toEqual(items);
  });

  it('should handle empty arrays', () => {
    const result = wrapListResponse([], 'items');

    expect(result.count).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('should include additional metadata', () => {
    const items = [{ id: 1 }];
    const result = wrapListResponse(items, 'data', { page: 1, total: 100 });

    expect(result.count).toBe(1);
    expect(result.page).toBe(1);
    expect(result.total).toBe(100);
  });
});

describe('formatEmployee', () => {
  it('should format employee as JSON', () => {
    const employee = { id: '123', firstName: 'John', lastName: 'Doe' };
    const result = formatEmployee(employee, ResponseFormat.JSON);

    expect(result).toContain('"id": "123"');
    expect(result).toContain('"firstName": "John"');
  });

  it('should format employee as Markdown', () => {
    const employee = {
      id: '123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      jobTitle: 'Engineer'
    };
    const result = formatEmployee(employee, ResponseFormat.MARKDOWN);

    expect(result).toContain('# Employee: John Doe');
    expect(result).toContain('**ID:** 123');
    expect(result).toContain('**Email:** john@example.com');
  });
});

describe('formatEmployeeList', () => {
  it('should include count in markdown header', () => {
    const employees = [
      { id: '1', firstName: 'John', lastName: 'Doe' },
      { id: '2', firstName: 'Jane', lastName: 'Smith' }
    ];
    const result = formatEmployeeList(employees, ResponseFormat.MARKDOWN);

    expect(result).toContain('# Employees (2)');
  });

  it('should format as JSON array', () => {
    const employees = [{ id: '1', firstName: 'Test', lastName: 'User' }];
    const result = formatEmployeeList(employees, ResponseFormat.JSON);

    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
  });
});

describe('truncateIfNeeded', () => {
  it('should not truncate short content', () => {
    const content = 'Short content';
    const result = truncateIfNeeded(content, 100);

    expect(result).toBe(content);
  });

  it('should truncate long content with message', () => {
    const content = 'A'.repeat(200);
    const result = truncateIfNeeded(content, 100);

    expect(result.length).toBeLessThan(content.length + 100);
    expect(result).toContain('truncated');
  });
});

describe('createPaginationInfo', () => {
  it('should indicate more results available', () => {
    const result = createPaginationInfo(100, 20, 0, 20);

    expect(result.has_more).toBe(true);
    expect(result.next_offset).toBe(20);
    expect(result.total).toBe(100);
    expect(result.count).toBe(20);
  });

  it('should indicate no more results', () => {
    const result = createPaginationInfo(50, 50, 0, 50);

    expect(result.has_more).toBe(false);
    expect(result.next_offset).toBeUndefined();
  });
});
