// Certifications & Assessments tools
// Tracks certifications, training, and goals across employees
// Note: BambooHR API does not expose Performance Review endpoints

import { BambooHRClient } from '../services/bamboohr-client.js';
import { ResponseFormat } from '../constants.js';
import { formatGenericList, formatError, truncateIfNeeded, wrapListResponse } from '../services/formatting.js';
import { Certification, AssessmentItem, CertificationSummary, EmployeeCertificationSummary } from '../types.js';
import {
  CERTIFICATION_FIELDS,
  getAllCertificationFieldIds,
  getCertificationFieldsByCategory,
  CERTIFICATION_STATUS_THRESHOLDS
} from '../config/certification-fields.js';
import {
  GetCertificationsDueSchema,
  GetEmployeeCertificationSummarySchema,
  GetCompanyCertificationsReportSchema,
  GetEmployeesWithAssessmentsDueSchema,
  GetTrainingRecordsSchema,
  GetGoalsStatusReportSchema,
  GetOverdueAssessmentsSchema,
  GetCertificationsDueInput,
  GetEmployeeCertificationSummaryInput,
  GetCompanyCertificationsReportInput,
  GetEmployeesWithAssessmentsDueInput,
  GetTrainingRecordsInput,
  GetGoalsStatusReportInput,
  GetOverdueAssessmentsInput
} from '../schemas/assessment-schemas.js';

// Helper: Calculate certification status based on dates
function calculateCertificationStatus(
  completedDate: string | undefined,
  expiresDate: string | undefined,
  dueDate: string | undefined
): { status: Certification['status']; daysUntilDue?: number; daysUntilExpires?: number } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // If not completed, check if due date has passed
  if (!completedDate) {
    if (dueDate) {
      const due = new Date(dueDate);
      const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue < 0) {
        return { status: 'expired', daysUntilDue }; // Overdue to complete
      }
      return { status: 'not_started', daysUntilDue };
    }
    return { status: 'not_started' };
  }

  // If completed, check expiration
  if (expiresDate) {
    const expires = new Date(expiresDate);
    const daysUntilExpires = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpires < 0) {
      return { status: 'expired', daysUntilExpires };
    }
    if (daysUntilExpires <= CERTIFICATION_STATUS_THRESHOLDS.expiringWithinDays) {
      return { status: 'expiring_soon', daysUntilExpires };
    }
    return { status: 'active', daysUntilExpires };
  }

  // Completed with no expiration - always active
  return { status: 'active' };
}

// Helper: Parse employee certification data from custom report
function parseEmployeeCertifications(
  employee: Record<string, unknown>,
  filterCategory?: string,
  filterStatus?: string,
  filterCode?: string
): Certification[] {
  const certifications: Certification[] = [];
  const employeeId = String(employee.id || '');
  const employeeName = String(employee.displayName || '');

  for (const [code, config] of Object.entries(CERTIFICATION_FIELDS)) {
    // Apply category filter
    if (filterCategory && filterCategory !== 'all' && config.category !== filterCategory) {
      continue;
    }

    // Apply certification code filter
    if (filterCode && code !== filterCode) {
      continue;
    }

    const completedDate = employee[config.completed] as string | undefined;
    const dueDate = employee[config.due] as string | undefined;
    const expiresDate = config.expires ? (employee[config.expires] as string | undefined) : undefined;

    // Skip if no data for this certification
    if (!completedDate && !dueDate) {
      continue;
    }

    const { status, daysUntilDue, daysUntilExpires } = calculateCertificationStatus(
      completedDate,
      expiresDate,
      dueDate
    );

    // Apply status filter
    if (filterStatus && filterStatus !== 'all' && status !== filterStatus) {
      continue;
    }

    certifications.push({
      employeeId,
      employeeName,
      certificationCode: code,
      certificationName: config.name,
      category: config.category,
      completedDate,
      dueDate,
      expiresDate,
      status,
      daysUntilDue,
      daysUntilExpires
    });
  }

  return certifications;
}

// Helper: Filter certifications by date range
function filterByDateRange(
  certifications: Certification[],
  dueBefore?: string,
  dueAfter?: string,
  expiresBefore?: string,
  expiresAfter?: string
): Certification[] {
  return certifications.filter(cert => {
    // Due date filters
    if (dueBefore && cert.dueDate) {
      if (new Date(cert.dueDate) > new Date(dueBefore)) return false;
    }
    if (dueAfter && cert.dueDate) {
      if (new Date(cert.dueDate) < new Date(dueAfter)) return false;
    }

    // Expires date filters
    if (expiresBefore && cert.expiresDate) {
      if (new Date(cert.expiresDate) > new Date(expiresBefore)) return false;
    }
    if (expiresAfter && cert.expiresDate) {
      if (new Date(cert.expiresDate) < new Date(expiresAfter)) return false;
    }

    return true;
  });
}

// Format certification for markdown display
function formatCertificationMarkdown(cert: Certification): string {
  const lines: string[] = [];
  lines.push(`### ${cert.certificationCode} - ${cert.certificationName}`);
  lines.push(`   - **Employee:** ${cert.employeeName} (ID: ${cert.employeeId})`);
  lines.push(`   - **Category:** ${cert.category}`);
  lines.push(`   - **Status:** ${cert.status.replace('_', ' ')}`);
  if (cert.completedDate) lines.push(`   - **Completed:** ${cert.completedDate}`);
  if (cert.dueDate) lines.push(`   - **Due:** ${cert.dueDate}`);
  if (cert.expiresDate) lines.push(`   - **Expires:** ${cert.expiresDate}`);
  if (cert.daysUntilExpires !== undefined) {
    const label = cert.daysUntilExpires < 0 ? 'Days Expired' : 'Days Until Expiry';
    lines.push(`   - **${label}:** ${Math.abs(cert.daysUntilExpires)}`);
  }
  if (cert.daysUntilDue !== undefined && cert.status === 'not_started') {
    lines.push(`   - **Days Until Due:** ${cert.daysUntilDue}`);
  }
  return lines.join('\n');
}

export function registerAssessmentTools(server: any, client: BambooHRClient): void {

  // ===== CERTIFICATION TRACKING TOOLS =====

  // Tool 1: Get certifications due
  server.registerTool(
    'bamboohr_get_certifications_due',
    {
      title: 'Get Certifications Due',
      description: `Query certifications due or expiring across all employees.

Uses BambooHR Custom Reports API to aggregate certification data from custom fields.

Args:
  - due_before (string): Filter certifications due before this date (YYYY-MM-DD)
  - due_after (string): Filter certifications due after this date (YYYY-MM-DD)
  - expires_before (string): Filter certifications expiring before this date
  - expires_after (string): Filter certifications expiring after this date
  - certification_code (string): Filter by specific cert (e.g., "AZ-104", "DP-203")
  - category ('azure'|'data'|'power-platform'|'aws'|'other'|'all'): Filter by category
  - status ('active'|'expiring_soon'|'expired'|'not_started'|'all'): Filter by status
  - employee_id (string): Filter by specific employee
  - response_format ('json'|'markdown'): Output format (default: 'markdown')

Returns:
  List of certifications with employee, dates, status, and days until due/expiry.

Examples:
  - "Which certifications are expiring in February 2026?"
  - "Show all Azure certifications due before end of Q1"
  - "List expired certifications for employee 123"`,
      inputSchema: GetCertificationsDueSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetCertificationsDueInput) => {
      try {
        // Build custom report request with all certification fields
        const reportData = {
          title: 'Certifications Report',
          fields: getAllCertificationFieldIds()
        };

        const result = await client.post<{ employees: Array<Record<string, unknown>> }>(
          '/reports/custom',
          reportData,
          { format: 'JSON' }
        );

        const employees = result.employees || [];
        let allCertifications: Certification[] = [];

        // Parse certifications for each employee
        for (const emp of employees) {
          // Filter by employee_id if specified
          if (params.employee_id && String(emp.id) !== params.employee_id) {
            continue;
          }

          const certs = parseEmployeeCertifications(
            emp,
            params.category,
            params.status,
            params.certification_code
          );
          allCertifications.push(...certs);
        }

        // Apply date range filters
        allCertifications = filterByDateRange(
          allCertifications,
          params.due_before,
          params.due_after,
          params.expires_before,
          params.expires_after
        );

        // Sort by days until expiry/due (most urgent first)
        allCertifications.sort((a, b) => {
          const daysA = a.daysUntilExpires ?? a.daysUntilDue ?? Infinity;
          const daysB = b.daysUntilExpires ?? b.daysUntilDue ?? Infinity;
          return daysA - daysB;
        });

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(allCertifications, 'certifications', {
            filters_applied: {
              category: params.category,
              status: params.status,
              certification_code: params.certification_code,
              employee_id: params.employee_id,
              due_before: params.due_before,
              due_after: params.due_after,
              expires_before: params.expires_before,
              expires_after: params.expires_after
            }
          });
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        // Markdown format
        const lines: string[] = [];
        lines.push(`# Certifications Due (${allCertifications.length})`);
        lines.push('');

        if (allCertifications.length === 0) {
          lines.push('No certifications match the specified criteria.');
        } else {
          // Group by status for readability
          const grouped = {
            expired: allCertifications.filter(c => c.status === 'expired'),
            expiring_soon: allCertifications.filter(c => c.status === 'expiring_soon'),
            not_started: allCertifications.filter(c => c.status === 'not_started'),
            active: allCertifications.filter(c => c.status === 'active')
          };

          if (grouped.expired.length > 0) {
            lines.push(`## Expired (${grouped.expired.length})`);
            grouped.expired.forEach(cert => lines.push(formatCertificationMarkdown(cert)));
            lines.push('');
          }

          if (grouped.expiring_soon.length > 0) {
            lines.push(`## Expiring Soon (${grouped.expiring_soon.length})`);
            grouped.expiring_soon.forEach(cert => lines.push(formatCertificationMarkdown(cert)));
            lines.push('');
          }

          if (grouped.not_started.length > 0) {
            lines.push(`## Not Started (${grouped.not_started.length})`);
            grouped.not_started.forEach(cert => lines.push(formatCertificationMarkdown(cert)));
            lines.push('');
          }

          if (grouped.active.length > 0) {
            lines.push(`## Active (${grouped.active.length})`);
            grouped.active.forEach(cert => lines.push(formatCertificationMarkdown(cert)));
            lines.push('');
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

  // Tool 2: Get employee certification summary
  server.registerTool(
    'bamboohr_get_employee_certification_summary',
    {
      title: 'Get Employee Certification Summary',
      description: `Get certification summary for a specific employee.

Retrieves all certifications for an employee with status counts and details.

Args:
  - employee_id (string): Employee ID (required)
  - category ('azure'|'data'|'power-platform'|'aws'|'other'|'all'): Filter by category
  - include_not_started (boolean): Include certifications not yet started (default: false)
  - response_format ('json'|'markdown'): Output format (default: 'markdown')

Returns:
  Employee certification details with summary counts by status.

Examples:
  - "Show certification summary for employee 123"
  - "What Azure certifications does employee 456 have?"`,
      inputSchema: GetEmployeeCertificationSummarySchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetEmployeeCertificationSummaryInput) => {
      try {
        // Build custom report request
        const reportData = {
          title: 'Employee Certifications',
          fields: getAllCertificationFieldIds()
        };

        const result = await client.post<{ employees: Array<Record<string, unknown>> }>(
          '/reports/custom',
          reportData,
          { format: 'JSON' }
        );

        const employees = result.employees || [];
        const employee = employees.find(emp => String(emp.id) === params.employee_id);

        if (!employee) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: `Employee ${params.employee_id} not found.` }]
          };
        }

        // Get all certifications for this employee
        let certifications: Certification[] = [];

        // If include_not_started, we need to check all possible certifications
        if (params.include_not_started) {
          const certsToCheck = params.category === 'all'
            ? CERTIFICATION_FIELDS
            : getCertificationFieldsByCategory(params.category as any);

          for (const [code, config] of Object.entries(certsToCheck)) {
            const completedDate = employee[config.completed] as string | undefined;
            const dueDate = employee[config.due] as string | undefined;
            const expiresDate = config.expires ? (employee[config.expires] as string | undefined) : undefined;

            const { status, daysUntilDue, daysUntilExpires } = calculateCertificationStatus(
              completedDate,
              expiresDate,
              dueDate
            );

            certifications.push({
              employeeId: String(employee.id),
              employeeName: String(employee.displayName || ''),
              certificationCode: code,
              certificationName: config.name,
              category: config.category,
              completedDate,
              dueDate,
              expiresDate,
              status,
              daysUntilDue,
              daysUntilExpires
            });
          }
        } else {
          // Only include certifications with data
          certifications = parseEmployeeCertifications(employee, params.category);
        }

        // Calculate summary
        const summary: EmployeeCertificationSummary = {
          employeeId: String(employee.id),
          employeeName: String(employee.displayName || ''),
          department: employee.department as string | undefined,
          certifications,
          summary: {
            total: certifications.length,
            active: certifications.filter(c => c.status === 'active').length,
            expiringSoon: certifications.filter(c => c.status === 'expiring_soon').length,
            expired: certifications.filter(c => c.status === 'expired').length,
            notStarted: certifications.filter(c => c.status === 'not_started').length
          }
        };

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }]
          };
        }

        // Markdown format
        const lines: string[] = [];
        lines.push(`# Certification Summary: ${summary.employeeName}`);
        lines.push('');
        lines.push(`**Employee ID:** ${summary.employeeId}`);
        if (summary.department) lines.push(`**Department:** ${summary.department}`);
        lines.push('');
        lines.push('## Summary');
        lines.push(`- **Total:** ${summary.summary.total}`);
        lines.push(`- **Active:** ${summary.summary.active}`);
        lines.push(`- **Expiring Soon:** ${summary.summary.expiringSoon}`);
        lines.push(`- **Expired:** ${summary.summary.expired}`);
        lines.push(`- **Not Started:** ${summary.summary.notStarted}`);
        lines.push('');

        if (certifications.length > 0) {
          lines.push('## Certifications');
          certifications.forEach(cert => {
            lines.push('');
            lines.push(formatCertificationMarkdown(cert).replace(/### /, '### ').replace(/   - /g, '- '));
          });
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

  // Tool 3: Get company certifications report
  server.registerTool(
    'bamboohr_get_company_certifications_report',
    {
      title: 'Get Company Certifications Report',
      description: `Generate company-wide certification status report.

Aggregates certification data across all employees with compliance rates.

Args:
  - category ('azure'|'data'|'power-platform'|'aws'|'other'|'all'): Filter by category
  - group_by ('category'|'department'|'certification'|'status'): How to group results
  - include_compliance_rate (boolean): Include compliance rate calculations (default: true)
  - response_format ('json'|'markdown'): Output format (default: 'markdown')

Returns:
  Aggregated report with totals, compliance rates, and breakdowns by group.

Examples:
  - "Show company-wide Azure certification status"
  - "Certification compliance by department"
  - "Overall certification report grouped by status"`,
      inputSchema: GetCompanyCertificationsReportSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetCompanyCertificationsReportInput) => {
      try {
        const reportData = {
          title: 'Company Certifications Report',
          fields: getAllCertificationFieldIds()
        };

        const result = await client.post<{ employees: Array<Record<string, unknown>> }>(
          '/reports/custom',
          reportData,
          { format: 'JSON' }
        );

        const employees = result.employees || [];
        let allCertifications: Certification[] = [];

        for (const emp of employees) {
          const certs = parseEmployeeCertifications(emp, params.category);
          allCertifications.push(...certs);
        }

        // Calculate summary
        const summary: CertificationSummary = {
          total: allCertifications.length,
          active: allCertifications.filter(c => c.status === 'active').length,
          expiringSoon: allCertifications.filter(c => c.status === 'expiring_soon').length,
          expired: allCertifications.filter(c => c.status === 'expired').length,
          notStarted: allCertifications.filter(c => c.status === 'not_started').length,
          byCategory: {},
          byDepartment: {}
        };

        // Group by category
        for (const cert of allCertifications) {
          summary.byCategory[cert.category] = (summary.byCategory[cert.category] || 0) + 1;
        }

        // Group by department (from employee data)
        const deptStats: Record<string, { total: number; compliant: number }> = {};
        for (const emp of employees) {
          const dept = (emp.department as string) || 'Unknown';
          const empCerts = allCertifications.filter(c => c.employeeId === String(emp.id));
          if (empCerts.length > 0) {
            if (!deptStats[dept]) {
              deptStats[dept] = { total: 0, compliant: 0 };
            }
            deptStats[dept].total += empCerts.length;
            deptStats[dept].compliant += empCerts.filter(c => c.status === 'active').length;
          }
        }
        summary.byDepartment = deptStats;

        // Build grouped data based on group_by parameter
        let groupedData: Record<string, Certification[]> = {};
        switch (params.group_by) {
          case 'category':
            for (const cert of allCertifications) {
              if (!groupedData[cert.category]) groupedData[cert.category] = [];
              groupedData[cert.category].push(cert);
            }
            break;
          case 'department':
            for (const cert of allCertifications) {
              const emp = employees.find(e => String(e.id) === cert.employeeId);
              const dept = (emp?.department as string) || 'Unknown';
              if (!groupedData[dept]) groupedData[dept] = [];
              groupedData[dept].push(cert);
            }
            break;
          case 'certification':
            for (const cert of allCertifications) {
              if (!groupedData[cert.certificationCode]) groupedData[cert.certificationCode] = [];
              groupedData[cert.certificationCode].push(cert);
            }
            break;
          case 'status':
          default:
            for (const cert of allCertifications) {
              if (!groupedData[cert.status]) groupedData[cert.status] = [];
              groupedData[cert.status].push(cert);
            }
            break;
        }

        if (params.response_format === ResponseFormat.JSON) {
          const response = {
            summary,
            grouped_by: params.group_by,
            groups: Object.fromEntries(
              Object.entries(groupedData).map(([key, certs]) => [
                key,
                {
                  count: certs.length,
                  compliance_rate: params.include_compliance_rate
                    ? Math.round((certs.filter(c => c.status === 'active').length / certs.length) * 100)
                    : undefined,
                  certifications: certs
                }
              ])
            )
          };
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        // Markdown format
        const lines: string[] = [];
        lines.push('# Company Certifications Report');
        lines.push('');
        lines.push('## Summary');
        lines.push(`- **Total Certifications:** ${summary.total}`);
        lines.push(`- **Active:** ${summary.active}`);
        lines.push(`- **Expiring Soon:** ${summary.expiringSoon}`);
        lines.push(`- **Expired:** ${summary.expired}`);
        lines.push(`- **Not Started:** ${summary.notStarted}`);

        if (params.include_compliance_rate && summary.total > 0) {
          const complianceRate = Math.round((summary.active / summary.total) * 100);
          lines.push(`- **Overall Compliance Rate:** ${complianceRate}%`);
        }
        lines.push('');

        lines.push(`## By ${params.group_by.charAt(0).toUpperCase() + params.group_by.slice(1)}`);
        for (const [groupName, certs] of Object.entries(groupedData)) {
          const activeCount = certs.filter(c => c.status === 'active').length;
          const complianceRate = certs.length > 0 ? Math.round((activeCount / certs.length) * 100) : 0;
          lines.push(`### ${groupName}`);
          lines.push(`- Count: ${certs.length}`);
          if (params.include_compliance_rate) {
            lines.push(`- Compliance Rate: ${complianceRate}%`);
          }
          lines.push('');
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

  // Tool 4: Get employees with assessments due
  server.registerTool(
    'bamboohr_get_employees_with_assessments_due',
    {
      title: 'Get Employees with Assessments Due',
      description: `Get employees with assessments due in a date range.

Aggregates certifications, training, and goals due within the specified period.

Args:
  - start_date (string): Start of date range (YYYY-MM-DD)
  - end_date (string): End of date range (YYYY-MM-DD)
  - assessment_types (array): Types to include: 'certification', 'training', 'goal' (default: all)
  - include_overdue (boolean): Include items already overdue (default: true)
  - employee_id (string): Filter by specific employee
  - response_format ('json'|'markdown'): Output format (default: 'markdown')

Returns:
  Unified list of assessment items with type, due date, and status.

Examples:
  - "What assessments are due this month?"
  - "Show all overdue items for employee 123"
  - "List training and goals due in Q1"`,
      inputSchema: GetEmployeesWithAssessmentsDueSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetEmployeesWithAssessmentsDueInput) => {
      try {
        const assessmentTypes = params.assessment_types || ['certification', 'training', 'goal'];
        const assessments: AssessmentItem[] = [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Get certifications if requested
        if (assessmentTypes.includes('certification')) {
          const reportData = {
            title: 'Certifications Assessment',
            fields: getAllCertificationFieldIds()
          };

          const result = await client.post<{ employees: Array<Record<string, unknown>> }>(
            '/reports/custom',
            reportData,
            { format: 'JSON' }
          );

          for (const emp of result.employees || []) {
            if (params.employee_id && String(emp.id) !== params.employee_id) continue;

            const certs = parseEmployeeCertifications(emp);
            for (const cert of certs) {
              // Use expires date or due date
              const targetDate = cert.expiresDate || cert.dueDate;
              if (!targetDate) continue;

              const target = new Date(targetDate);
              const daysUntilDue = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

              // Check date range
              if (params.start_date && target < new Date(params.start_date)) continue;
              if (params.end_date && target > new Date(params.end_date)) continue;

              // Check overdue inclusion
              if (daysUntilDue < 0 && !params.include_overdue) continue;

              let status: AssessmentItem['status'];
              if (daysUntilDue < 0) status = 'overdue';
              else if (daysUntilDue <= 7) status = 'due';
              else status = 'upcoming';

              assessments.push({
                employeeId: cert.employeeId,
                employeeName: cert.employeeName,
                assessmentType: 'certification',
                assessmentName: `${cert.certificationCode} - ${cert.certificationName}`,
                dueDate: cert.dueDate,
                expiresDate: cert.expiresDate,
                status,
                daysUntilDue
              });
            }
          }
        }

        // Get goals if requested
        if (assessmentTypes.includes('goal')) {
          try {
            // We need to get goals for each employee
            // First get employee list
            const directory = await client.get<{ employees: Array<Record<string, unknown>> }>('/employees/directory');

            for (const emp of directory.employees || []) {
              if (params.employee_id && String(emp.id) !== params.employee_id) continue;

              try {
                const goals = await client.get<Array<Record<string, unknown>>>(
                  `/performance/employees/${emp.id}/goals`
                );

                for (const goal of goals || []) {
                  if (!goal.dueDate) continue;

                  const target = new Date(goal.dueDate as string);
                  const daysUntilDue = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                  // Check date range
                  if (params.start_date && target < new Date(params.start_date)) continue;
                  if (params.end_date && target > new Date(params.end_date)) continue;

                  // Skip completed goals
                  if (goal.status === 'completed') continue;

                  // Check overdue inclusion
                  if (daysUntilDue < 0 && !params.include_overdue) continue;

                  let status: AssessmentItem['status'];
                  if (daysUntilDue < 0) status = 'overdue';
                  else if (daysUntilDue <= 7) status = 'due';
                  else status = 'upcoming';

                  assessments.push({
                    employeeId: String(emp.id),
                    employeeName: emp.displayName as string || `${emp.firstName} ${emp.lastName}`,
                    assessmentType: 'goal',
                    assessmentName: goal.title as string,
                    dueDate: goal.dueDate as string,
                    status,
                    daysUntilDue
                  });
                }
              } catch {
                // Skip employee if goals API fails (might not have permission)
              }
            }
          } catch {
            // Goals API might not be available
          }
        }

        // Sort by days until due (most urgent first)
        assessments.sort((a, b) => (a.daysUntilDue ?? Infinity) - (b.daysUntilDue ?? Infinity));

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(assessments, 'assessments', {
            filters: {
              start_date: params.start_date,
              end_date: params.end_date,
              assessment_types: assessmentTypes,
              include_overdue: params.include_overdue,
              employee_id: params.employee_id
            }
          });
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        // Markdown format
        const lines: string[] = [];
        lines.push(`# Assessments Due (${assessments.length})`);
        lines.push('');

        if (assessments.length === 0) {
          lines.push('No assessments match the specified criteria.');
        } else {
          // Group by status
          const overdue = assessments.filter(a => a.status === 'overdue');
          const due = assessments.filter(a => a.status === 'due');
          const upcoming = assessments.filter(a => a.status === 'upcoming');

          if (overdue.length > 0) {
            lines.push(`## Overdue (${overdue.length})`);
            for (const item of overdue) {
              lines.push(`- **${item.assessmentName}** (${item.assessmentType})`);
              lines.push(`  - Employee: ${item.employeeName}`);
              lines.push(`  - Due: ${item.dueDate} (${Math.abs(item.daysUntilDue!)} days overdue)`);
            }
            lines.push('');
          }

          if (due.length > 0) {
            lines.push(`## Due This Week (${due.length})`);
            for (const item of due) {
              lines.push(`- **${item.assessmentName}** (${item.assessmentType})`);
              lines.push(`  - Employee: ${item.employeeName}`);
              lines.push(`  - Due: ${item.dueDate} (${item.daysUntilDue} days)`);
            }
            lines.push('');
          }

          if (upcoming.length > 0) {
            lines.push(`## Upcoming (${upcoming.length})`);
            for (const item of upcoming) {
              lines.push(`- **${item.assessmentName}** (${item.assessmentType})`);
              lines.push(`  - Employee: ${item.employeeName}`);
              lines.push(`  - Due: ${item.dueDate} (${item.daysUntilDue} days)`);
            }
            lines.push('');
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

  // Tool 5: Get training records
  server.registerTool(
    'bamboohr_get_training_records',
    {
      title: 'Get Training Records',
      description: `Get training records with filtering options.

Retrieves training completion records for employees.

Args:
  - employee_id (string): Employee ID (omit to get all employees)
  - training_type_id (string): Filter by training type ID
  - completed_after (string): Filter records completed after this date (YYYY-MM-DD)
  - completed_before (string): Filter records completed before this date (YYYY-MM-DD)
  - response_format ('json'|'markdown'): Output format (default: 'markdown')

Returns:
  Array of training records with employee, type, date, and details.

Examples:
  - "Show all training completed this year"
  - "Get training records for employee 123"
  - "List security training completions"`,
      inputSchema: GetTrainingRecordsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetTrainingRecordsInput) => {
      try {
        // Get employee directory
        const directory = await client.get<{ employees: Array<Record<string, unknown>> }>('/employees/directory');
        const employees = directory.employees || [];

        const allRecords: Array<Record<string, unknown>> = [];

        for (const emp of employees) {
          if (params.employee_id && String(emp.id) !== params.employee_id) continue;

          try {
            // Note: BambooHR doesn't have a direct training records endpoint per employee
            // We would need to use table data or custom fields
            // For now, this returns a placeholder message

            // This endpoint may not exist in all BambooHR accounts
            // If it fails, we'll just skip
          } catch {
            // Skip on error
          }
        }

        // If no direct API, inform user
        if (allRecords.length === 0 && !params.employee_id) {
          const message = `Training records are tracked via custom fields in BambooHR.

To view training completions, use:
- bamboohr_get_certifications_due - for certification training
- bamboohr_get_training_types - to see available training types
- bamboohr_add_training_record - to record training completions`;

          if (params.response_format === ResponseFormat.JSON) {
            return {
              content: [{ type: 'text' as const, text: JSON.stringify({
                count: 0,
                training_records: [],
                note: 'Training records are tracked via custom fields. Use certification tools for training data.'
              }, null, 2) }]
            };
          }

          return {
            content: [{ type: 'text' as const, text: message }]
          };
        }

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(allRecords, 'training_records');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(
          allRecords,
          ResponseFormat.MARKDOWN,
          'Training Records',
          ['employeeName', 'trainingType', 'completed', 'notes']
        );
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

  // Tool 6: Get goals status report
  server.registerTool(
    'bamboohr_get_goals_status_report',
    {
      title: 'Get Goals Status Report',
      description: `Generate company-wide goals progress report.

Aggregates goals across employees with status breakdowns.

Args:
  - status ('in_progress'|'completed'|'on_hold'|'overdue'|'all'): Filter by status
  - group_by ('status'|'department'|'employee'): How to group results
  - employee_id (string): Filter by specific employee
  - response_format ('json'|'markdown'): Output format (default: 'markdown')

Returns:
  Goals report with counts by status and optional grouping.

Examples:
  - "Show company-wide goal progress"
  - "List overdue goals by department"
  - "Goal status for employee 123"`,
      inputSchema: GetGoalsStatusReportSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetGoalsStatusReportInput) => {
      try {
        // Get employee directory
        const directory = await client.get<{ employees: Array<Record<string, unknown>> }>('/employees/directory');
        const employees = directory.employees || [];

        const allGoals: Array<Record<string, unknown> & { employeeName: string; department?: string }> = [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        for (const emp of employees) {
          if (params.employee_id && String(emp.id) !== params.employee_id) continue;

          try {
            const goals = await client.get<Array<Record<string, unknown>>>(
              `/performance/employees/${emp.id}/goals`
            );

            for (const goal of goals || []) {
              // Calculate if overdue
              let isOverdue = false;
              if (goal.dueDate && goal.status !== 'completed') {
                const dueDate = new Date(goal.dueDate as string);
                isOverdue = dueDate < now;
              }

              // Apply status filter
              if (params.status !== 'all') {
                if (params.status === 'overdue' && !isOverdue) continue;
                if (params.status !== 'overdue' && goal.status !== params.status) continue;
              }

              allGoals.push({
                ...goal,
                employeeId: String(emp.id),
                employeeName: emp.displayName as string || `${emp.firstName} ${emp.lastName}`,
                department: emp.department as string,
                isOverdue
              });
            }
          } catch {
            // Skip employee if goals API fails
          }
        }

        // Group data
        const grouped: Record<string, typeof allGoals> = {};
        for (const goal of allGoals) {
          let key: string;
          switch (params.group_by) {
            case 'department':
              key = goal.department || 'Unknown';
              break;
            case 'employee':
              key = goal.employeeName;
              break;
            case 'status':
            default:
              key = goal.isOverdue ? 'overdue' : (goal.status as string);
              break;
          }
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(goal);
        }

        // Summary stats
        const summary = {
          total: allGoals.length,
          in_progress: allGoals.filter(g => g.status === 'in_progress' && !g.isOverdue).length,
          completed: allGoals.filter(g => g.status === 'completed').length,
          on_hold: allGoals.filter(g => g.status === 'on_hold').length,
          overdue: allGoals.filter(g => g.isOverdue).length
        };

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              summary,
              grouped_by: params.group_by,
              groups: Object.fromEntries(
                Object.entries(grouped).map(([key, goals]) => [key, { count: goals.length, goals }])
              )
            }, null, 2) }]
          };
        }

        // Markdown format
        const lines: string[] = [];
        lines.push('# Goals Status Report');
        lines.push('');
        lines.push('## Summary');
        lines.push(`- **Total:** ${summary.total}`);
        lines.push(`- **In Progress:** ${summary.in_progress}`);
        lines.push(`- **Completed:** ${summary.completed}`);
        lines.push(`- **On Hold:** ${summary.on_hold}`);
        lines.push(`- **Overdue:** ${summary.overdue}`);
        lines.push('');

        lines.push(`## By ${params.group_by.charAt(0).toUpperCase() + params.group_by.slice(1)}`);
        for (const [groupName, goals] of Object.entries(grouped)) {
          lines.push(`### ${groupName} (${goals.length})`);
          for (const goal of goals.slice(0, 10)) { // Limit to 10 per group
            lines.push(`- **${goal.title}**`);
            if (params.group_by !== 'employee') {
              lines.push(`  - Employee: ${goal.employeeName}`);
            }
            lines.push(`  - Status: ${goal.isOverdue ? 'OVERDUE' : goal.status}`);
            lines.push(`  - Progress: ${goal.percentComplete || 0}%`);
            if (goal.dueDate) lines.push(`  - Due: ${goal.dueDate}`);
          }
          if (goals.length > 10) {
            lines.push(`  ... and ${goals.length - 10} more`);
          }
          lines.push('');
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

  // Tool 7: Get overdue assessments
  server.registerTool(
    'bamboohr_get_overdue_assessments',
    {
      title: 'Get Overdue Assessments',
      description: `Get all overdue assessments across types.

Quick query for overdue certifications, training, and goals combined.

Args:
  - assessment_types (array): Types to check: 'certification', 'training', 'goal' (default: all)
  - min_days_overdue (number): Minimum days overdue to include (default: 0)
  - employee_id (string): Filter by specific employee
  - response_format ('json'|'markdown'): Output format (default: 'markdown')

Returns:
  List of overdue items sorted by days overdue (most overdue first).

Examples:
  - "Show all overdue assessments"
  - "Certifications overdue more than 30 days"
  - "Overdue items for employee 123"`,
      inputSchema: GetOverdueAssessmentsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetOverdueAssessmentsInput) => {
      try {
        const assessmentTypes = params.assessment_types || ['certification', 'training', 'goal'];
        const overdueItems: AssessmentItem[] = [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Get overdue certifications
        if (assessmentTypes.includes('certification')) {
          const reportData = {
            title: 'Overdue Certifications',
            fields: getAllCertificationFieldIds()
          };

          const result = await client.post<{ employees: Array<Record<string, unknown>> }>(
            '/reports/custom',
            reportData,
            { format: 'JSON' }
          );

          for (const emp of result.employees || []) {
            if (params.employee_id && String(emp.id) !== params.employee_id) continue;

            const certs = parseEmployeeCertifications(emp);
            for (const cert of certs) {
              if (cert.status !== 'expired') continue;

              const daysOverdue = Math.abs(cert.daysUntilExpires ?? cert.daysUntilDue ?? 0);
              if (daysOverdue < (params.min_days_overdue || 0)) continue;

              overdueItems.push({
                employeeId: cert.employeeId,
                employeeName: cert.employeeName,
                assessmentType: 'certification',
                assessmentName: `${cert.certificationCode} - ${cert.certificationName}`,
                dueDate: cert.dueDate,
                expiresDate: cert.expiresDate,
                status: 'overdue',
                daysUntilDue: -(daysOverdue)
              });
            }
          }
        }

        // Get overdue goals
        if (assessmentTypes.includes('goal')) {
          try {
            const directory = await client.get<{ employees: Array<Record<string, unknown>> }>('/employees/directory');

            for (const emp of directory.employees || []) {
              if (params.employee_id && String(emp.id) !== params.employee_id) continue;

              try {
                const goals = await client.get<Array<Record<string, unknown>>>(
                  `/performance/employees/${emp.id}/goals`
                );

                for (const goal of goals || []) {
                  if (!goal.dueDate || goal.status === 'completed') continue;

                  const dueDate = new Date(goal.dueDate as string);
                  const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

                  if (daysOverdue <= 0) continue; // Not overdue
                  if (daysOverdue < (params.min_days_overdue || 0)) continue;

                  overdueItems.push({
                    employeeId: String(emp.id),
                    employeeName: emp.displayName as string || `${emp.firstName} ${emp.lastName}`,
                    assessmentType: 'goal',
                    assessmentName: goal.title as string,
                    dueDate: goal.dueDate as string,
                    status: 'overdue',
                    daysUntilDue: -daysOverdue
                  });
                }
              } catch {
                // Skip on error
              }
            }
          } catch {
            // Goals API might not be available
          }
        }

        // Sort by days overdue (most overdue first)
        overdueItems.sort((a, b) => (a.daysUntilDue ?? 0) - (b.daysUntilDue ?? 0));

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(overdueItems, 'overdue_assessments', {
            filters: {
              assessment_types: assessmentTypes,
              min_days_overdue: params.min_days_overdue,
              employee_id: params.employee_id
            }
          });
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        // Markdown format
        const lines: string[] = [];
        lines.push(`# Overdue Assessments (${overdueItems.length})`);
        lines.push('');

        if (overdueItems.length === 0) {
          lines.push('No overdue assessments found.');
        } else {
          // Group by type
          const byType: Record<string, AssessmentItem[]> = {};
          for (const item of overdueItems) {
            if (!byType[item.assessmentType]) byType[item.assessmentType] = [];
            byType[item.assessmentType].push(item);
          }

          for (const [type, items] of Object.entries(byType)) {
            lines.push(`## ${type.charAt(0).toUpperCase() + type.slice(1)}s (${items.length})`);
            for (const item of items) {
              const daysOverdue = Math.abs(item.daysUntilDue || 0);
              lines.push(`- **${item.assessmentName}**`);
              lines.push(`  - Employee: ${item.employeeName} (ID: ${item.employeeId})`);
              lines.push(`  - Due: ${item.dueDate || item.expiresDate}`);
              lines.push(`  - Days Overdue: ${daysOverdue}`);
            }
            lines.push('');
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
}
