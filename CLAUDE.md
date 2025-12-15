# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **full CRUD** MCP (Model Context Protocol) server for BambooHR API integration (v2.0.0). It enables AI assistants (like Claude Desktop) to manage employees, time off, files, goals, training, applicant tracking, benefits, and time tracking in BambooHR.

**64 tools** across 8 domains with safety confirmations for destructive operations.

## Build and Run Commands

```bash
# Install dependencies
npm install

# Build the project (compiles TypeScript to dist/)
npm run build

# Run the server (stdio mode, default)
npm start

# Development mode (watch for TypeScript changes)
npm run dev

# Clean build artifacts
npm run clean

# Run with HTTP transport
TRANSPORT=http PORT=3000 npm start
```

## Architecture

### Entry Point
`src/index.ts` - Initializes the MCP server, validates environment variables, registers all 8 tool modules, and handles transport (stdio or HTTP).

### Core Services
- `src/services/bamboohr-client.ts` - API client with Basic Auth, 5-minute response caching, retry logic with exponential backoff for rate limits (429/503), multipart form data for file uploads, and error handling
- `src/services/formatting.ts` - Response formatting (JSON/Markdown output)

### Tool Modules (64 tools total)

| Module | File | Tools | Description |
|--------|------|-------|-------------|
| Employees | `employees.ts` | 9 | CRUD for employee records, custom fields, table rows |
| Time Off | `timeoff.ts` | 9 | Requests, approvals, balance adjustments, policies |
| Files | `files.ts` | 6 | Upload/delete employee files and photos |
| Goals | `goals.ts` | 7 | Performance goals with comments |
| Metadata | `metadata.ts` | 10 | Fields, training records, list values |
| ATS | `applicant-tracking.ts` | 10 | Job openings, candidates, applications |
| Benefits | `benefits.ts` | 7 | Dependents, benefit plans, enrollments |
| Time Tracking | `time-tracking.ts` | 7 | Clock in/out, hour records, projects |

### Tool Registration Pattern

```typescript
registerEmployeeTools(server, bambooClient);      // employees.ts
registerTimeOffTools(server, bambooClient);       // timeoff.ts
registerMetadataTools(server, bambooClient);      // metadata.ts
registerFileTools(server, bambooClient);          // files.ts
registerGoalTools(server, bambooClient);          // goals.ts
registerApplicantTrackingTools(server, bambooClient); // applicant-tracking.ts
registerBenefitsTools(server, bambooClient);      // benefits.ts
registerTimeTrackingTools(server, bambooClient);  // time-tracking.ts
```

### Tool Annotations

```typescript
// READ operations
annotations: {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true
}

// CREATE operations
annotations: {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,  // POST creates are not idempotent
  openWorldHint: true
}

// UPDATE operations
annotations: {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,   // PUT updates are idempotent
  openWorldHint: true
}

// DELETE operations (requires confirm: true)
annotations: {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: true
}
```

### Response Format
All tools return MCP-compliant responses:
```typescript
{
  content: [{ type: 'text', text: '...' }],
  isError?: boolean
}
```

### Environment Variables
- `BAMBOOHR_API_KEY` (required) - API key for BambooHR authentication
- `BAMBOOHR_COMPANY_DOMAIN` (required) - Company subdomain (e.g., "acmecorp" from acmecorp.bamboohr.com)
- `TRANSPORT` (optional) - "stdio" (default) or "http"
- `PORT` (optional) - HTTP port when using HTTP transport (default: 3000)

## Safety Pattern for Destructive Operations

All DELETE operations require explicit `confirm: true`:

```typescript
inputSchema: z.object({
  employee_id: EmployeeIdSchema,
  file_id: z.string(),
  confirm: z.boolean()
    .describe('Must be set to true to confirm deletion')
    .refine(val => val === true, {
      message: 'Confirmation required'
    }),
  response_format: ResponseFormatSchema
})
```

## API Integration Notes

- Base URL: `https://{domain}.bamboohr.com/api/v1`
- Authentication: HTTP Basic Auth (API key as username, "x" as password)
- File uploads: Multipart form data via `uploadFile()` and `uploadPhoto()` methods
- The `/employees/{id}` endpoint with `fields` query parameter is preferred for retrieving specific employee data
- Fallback to `/employees/directory` when permissions are insufficient (403/401)

## Cross-Platform Compatibility

The compiled `dist/` folder runs on any platform with Node.js 18+:
- macOS ✓
- Windows ✓
- Linux ✓

Build once, run anywhere.
