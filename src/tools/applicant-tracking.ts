// Applicant Tracking System (ATS) tools
// Includes job openings, applications, and candidate management

import { z } from 'zod';
import { BambooHRClient } from '../services/bamboohr-client.js';
import { ResponseFormatSchema } from '../schemas/common.js';
import { ResponseFormat } from '../constants.js';
import { formatGenericList, formatError, truncateIfNeeded, wrapListResponse } from '../services/formatting.js';

export function registerApplicantTrackingTools(server: any, client: BambooHRClient): void {

  // ===== READ OPERATIONS =====

  // Get job summaries
  server.registerTool(
    'bamboohr_get_job_summaries',
    {
      title: 'Get Job Summaries',
      description: `Get a summary of all job postings.

Returns high-level information about all jobs/openings in the ATS.

Args:
  - status (string): Filter by status - 'open', 'closed', 'draft', 'all' (optional, defaults to 'open')
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of job posting summaries with id, title, status, department, location.

Examples:
  - "Show all open positions"
  - "List job postings"
  - "Get closed job openings"`,
      inputSchema: z.object({
        status: z.enum(['open', 'closed', 'draft', 'all']).optional().default('open').describe('Filter by job status'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { status?: string; response_format: ResponseFormat }) => {
      try {
        const queryParams: Record<string, string> = {};
        if (params.status && params.status !== 'all') {
          queryParams.status = params.status;
        }

        const jobs = await client.get<Array<Record<string, unknown>>>('/applicant_tracking/jobs', queryParams);

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(jobs, 'jobs');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(jobs, ResponseFormat.MARKDOWN, 'Job Openings', ['id', 'title', 'status', 'department', 'location']);
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

  // Get job details
  server.registerTool(
    'bamboohr_get_job_details',
    {
      title: 'Get Job Details',
      description: `Get detailed information about a specific job opening.

Returns full job details including description, requirements, and hiring team.

Args:
  - job_id (string): Job ID (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Job object with full details.`,
      inputSchema: z.object({
        job_id: z.string().describe('Job ID'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { job_id: string; response_format: ResponseFormat }) => {
      try {
        const job = await client.get<Record<string, unknown>>(`/applicant_tracking/jobs/${params.job_id}`);

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(job, null, 2) }]
          };
        }

        return {
          content: [{ type: 'text' as const, text: `# Job: ${job.title}\n\n${JSON.stringify(job, null, 2)}` }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // Get job applications
  server.registerTool(
    'bamboohr_get_job_applications',
    {
      title: 'Get Job Applications',
      description: `Get applications for a specific job opening.

Returns all applications submitted for a job, including candidate information and application status.

Args:
  - job_id (string): Job ID to get applications for (required)
  - status (string): Filter by application status (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of application objects with candidate and status details.

Examples:
  - "Show applications for job 123"
  - "List candidates for Software Engineer position"`,
      inputSchema: z.object({
        job_id: z.string().describe('Job ID'),
        status: z.string().optional().describe('Filter by status'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { job_id: string; status?: string; response_format: ResponseFormat }) => {
      try {
        const queryParams: Record<string, string> = {};
        if (params.status) queryParams.status = params.status;

        const applications = await client.get<Array<Record<string, unknown>>>(
          `/applicant_tracking/jobs/${params.job_id}/applications`,
          queryParams
        );

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(applications, 'applications');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(applications, ResponseFormat.MARKDOWN, 'Job Applications', ['id', 'candidateName', 'status', 'appliedDate', 'rating']);
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

  // Get application details
  server.registerTool(
    'bamboohr_get_application_details',
    {
      title: 'Get Application Details',
      description: `Get detailed information about a specific application.

Returns full application details including candidate info, resume, and status history.

Args:
  - application_id (string): Application ID (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Application object with full details.`,
      inputSchema: z.object({
        application_id: z.string().describe('Application ID'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { application_id: string; response_format: ResponseFormat }) => {
      try {
        const application = await client.get<Record<string, unknown>>(
          `/applicant_tracking/applications/${params.application_id}`
        );

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(application, null, 2) }]
          };
        }

        return {
          content: [{ type: 'text' as const, text: `# Application Details\n\n${JSON.stringify(application, null, 2)}` }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: formatError(error) }]
        };
      }
    }
  );

  // Get application statuses
  server.registerTool(
    'bamboohr_get_application_statuses',
    {
      title: 'Get Application Statuses',
      description: `Get available application statuses for the ATS.

Returns the list of possible statuses that can be assigned to applications.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Array of status objects with id and name.`,
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
        const statuses = await client.get<Array<Record<string, unknown>>>('/applicant_tracking/statuses');

        if (params.response_format === ResponseFormat.JSON) {
          const response = wrapListResponse(statuses, 'statuses');
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }]
          };
        }

        const formatted = formatGenericList(statuses, ResponseFormat.MARKDOWN, 'Application Statuses', ['id', 'name']);
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

  // Create job opening
  server.registerTool(
    'bamboohr_create_job_opening',
    {
      title: 'Create Job Opening',
      description: `Create a new job opening/posting.

Creates a new job requisition in the ATS.

Args:
  - title (string): Job title (required)
  - department_id (string): Department ID (optional)
  - location_id (string): Location ID (optional)
  - description (string): Job description (optional)
  - minimum_experience (string): Minimum experience required (optional)
  - employment_status_id (string): Employment status ID (full-time, part-time, etc.) (optional)
  - hiring_lead_id (string): Employee ID of hiring lead (optional)
  - internal_job_code (string): Internal job code (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Created job with ID.

Examples:
  - "Create a job opening for Senior Developer"
  - "Post a new Marketing Manager position"`,
      inputSchema: z.object({
        title: z.string().describe('Job title'),
        department_id: z.string().optional().describe('Department ID'),
        location_id: z.string().optional().describe('Location ID'),
        description: z.string().optional().describe('Job description'),
        minimum_experience: z.string().optional().describe('Minimum experience required'),
        employment_status_id: z.string().optional().describe('Employment status ID'),
        hiring_lead_id: z.string().optional().describe('Employee ID of hiring lead'),
        internal_job_code: z.string().optional().describe('Internal job code'),
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
      title: string;
      department_id?: string;
      location_id?: string;
      description?: string;
      minimum_experience?: string;
      employment_status_id?: string;
      hiring_lead_id?: string;
      internal_job_code?: string;
      response_format: ResponseFormat
    }) => {
      try {
        const jobData = {
          title: params.title,
          ...(params.department_id && { departmentId: params.department_id }),
          ...(params.location_id && { locationId: params.location_id }),
          ...(params.description && { description: params.description }),
          ...(params.minimum_experience && { minimumExperience: params.minimum_experience }),
          ...(params.employment_status_id && { employmentStatusId: params.employment_status_id }),
          ...(params.hiring_lead_id && { hiringLeadId: params.hiring_lead_id }),
          ...(params.internal_job_code && { internalJobCode: params.internal_job_code })
        };

        const result = await client.post<{ id?: string }>('/applicant_tracking/jobs', jobData);

        const jobId = result?.id || 'created';
        const message = `Successfully created job opening "${params.title}". Job ID: ${jobId}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              job_id: jobId,
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

  // Create candidate/application
  server.registerTool(
    'bamboohr_create_candidate',
    {
      title: 'Create Candidate Application',
      description: `Create a new candidate application for a job.

Adds a new candidate to the ATS for a specific job opening.

Args:
  - job_id (string): Job ID to apply for (required)
  - first_name (string): Candidate first name (required)
  - last_name (string): Candidate last name (required)
  - email (string): Candidate email (required)
  - phone (string): Candidate phone number (optional)
  - source (string): Application source (e.g., "LinkedIn", "Referral", "Website") (optional)
  - resume_text (string): Resume content as text (optional)
  - cover_letter (string): Cover letter content (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Created application with ID.

Examples:
  - "Add candidate John Smith to job 123"
  - "Create an application for the developer position"`,
      inputSchema: z.object({
        job_id: z.string().describe('Job ID to apply for'),
        first_name: z.string().describe('Candidate first name'),
        last_name: z.string().describe('Candidate last name'),
        email: z.string().email().describe('Candidate email'),
        phone: z.string().optional().describe('Candidate phone number'),
        source: z.string().optional().describe('Application source'),
        resume_text: z.string().optional().describe('Resume content'),
        cover_letter: z.string().optional().describe('Cover letter content'),
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
      job_id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
      source?: string;
      resume_text?: string;
      cover_letter?: string;
      response_format: ResponseFormat
    }) => {
      try {
        const applicationData = {
          jobId: params.job_id,
          firstName: params.first_name,
          lastName: params.last_name,
          email: params.email,
          ...(params.phone && { phone: params.phone }),
          ...(params.source && { source: params.source }),
          ...(params.resume_text && { resume: params.resume_text }),
          ...(params.cover_letter && { coverLetter: params.cover_letter })
        };

        const result = await client.post<{ id?: string }>('/applicant_tracking/applications', applicationData);

        const applicationId = result?.id || 'created';
        const message = `Successfully created application for ${params.first_name} ${params.last_name}. Application ID: ${applicationId}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              application_id: applicationId,
              job_id: params.job_id,
              candidate: `${params.first_name} ${params.last_name}`
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

  // Update applicant status
  server.registerTool(
    'bamboohr_update_applicant_status',
    {
      title: 'Update Applicant Status',
      description: `Update the status of a job application.

Moves an application through the hiring pipeline (e.g., screen → interview → offer).

Args:
  - application_id (string): Application ID (required)
  - status_id (string): New status ID (use bamboohr_get_application_statuses to see options) (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation.

Examples:
  - "Move application 123 to interview stage"
  - "Mark application 456 as hired"`,
      inputSchema: z.object({
        application_id: z.string().describe('Application ID'),
        status_id: z.string().describe('New status ID'),
        response_format: ResponseFormatSchema
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: { application_id: string; status_id: string; response_format: ResponseFormat }) => {
      try {
        await client.post(`/applicant_tracking/applications/${params.application_id}/status`, {
          statusId: params.status_id
        });

        const message = `Successfully updated application ${params.application_id} to status ${params.status_id}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              application_id: params.application_id,
              new_status_id: params.status_id
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

  // Add application comment
  server.registerTool(
    'bamboohr_add_application_comment',
    {
      title: 'Add Application Comment',
      description: `Add a comment/note to a job application.

Posts feedback, interview notes, or other comments to an application.

Args:
  - application_id (string): Application ID (required)
  - comment (string): Comment text (required)
  - response_format ('json' | 'markdown'): Output format (default: 'markdown')

Returns:
  Success confirmation.

Examples:
  - "Add interview feedback to application 123"
  - "Note that candidate 456 needs follow-up"`,
      inputSchema: z.object({
        application_id: z.string().describe('Application ID'),
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
    async (params: { application_id: string; comment: string; response_format: ResponseFormat }) => {
      try {
        await client.post(`/applicant_tracking/applications/${params.application_id}/comments`, {
          text: params.comment
        });

        const message = `Successfully added comment to application ${params.application_id}`;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({
              success: true,
              application_id: params.application_id
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
