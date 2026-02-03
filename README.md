# BambooHR MCP Server

[![npm version](https://img.shields.io/npm/v/@twentytwokhz/bamboohr-mcp)](https://www.npmjs.com/package/@twentytwokhz/bamboohr-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

A comprehensive Model Context Protocol (MCP) server for BambooHR API integration with **full CRUD operations**. This server enables AI assistants to manage employees, time off, files, goals, training, applicant tracking, benefits, time tracking, and certifications in BambooHR.

## Features

- **71 Tools** covering all major BambooHR API endpoints
- **Full CRUD Operations** - Create, Read, Update, Delete across all domains
- **Cross-Platform** - Runs on macOS, Windows, and Linux
- **Safety Confirmations** - Destructive operations require explicit `confirm: true`
- **Dual Output Formats** - JSON or Markdown responses
- **Two Transport Modes** - stdio (Claude Desktop) or HTTP (API server)

## Quick Start

### Prerequisites
- Node.js 18+ installed
- BambooHR account with API access
- Your BambooHR API key

### Installation via npm (Recommended)

```bash
npm install -g @twentytwokhz/bamboohr-mcp
```

Or use directly with npx (no install required):
```bash
npx @twentytwokhz/bamboohr-mcp
```

### Installation from Source

```bash
git clone https://github.com/twentytwokhz/bamboohr-mcp.git
cd bamboohr-mcp
npm install
npm run build
```

### Get Your BambooHR Credentials

Before configuring the MCP server, you'll need:

**1. API Key:**
1. Log in to BambooHR
2. Click your name in the lower left corner
3. Select "API Keys"
4. Click "Add New Key"
5. Copy the generated key

**2. Company Domain:**
Your company subdomain from your BambooHR URL.
- Example: `https://acmecorp.bamboohr.com` → use `acmecorp`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BAMBOOHR_API_KEY` | Yes | Your BambooHR API key |
| `BAMBOOHR_COMPANY_DOMAIN` | Yes | Your company subdomain |
| `TRANSPORT` | No | `stdio` (default) or `http` |
| `PORT` | No | HTTP port (default: 3000) |

**For npm/npx users:** Set these in your Claude Desktop config (see below).

**For local development:** Create a `.env` file:

```env
BAMBOOHR_API_KEY=your_api_key_here
BAMBOOHR_COMPANY_DOMAIN=your_company_subdomain
```

## Claude Desktop Integration

Add to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

### Using npx (Recommended)

```json
{
  "mcpServers": {
    "bamboohr": {
      "command": "npx",
      "args": ["@twentytwokhz/bamboohr-mcp"],
      "env": {
        "BAMBOOHR_API_KEY": "your_api_key_here",
        "BAMBOOHR_COMPANY_DOMAIN": "your_domain"
      }
    }
  }
}
```

### Using Global Install

```json
{
  "mcpServers": {
    "bamboohr": {
      "command": "bamboohr-mcp",
      "args": [],
      "env": {
        "BAMBOOHR_API_KEY": "your_api_key_here",
        "BAMBOOHR_COMPANY_DOMAIN": "your_domain"
      }
    }
  }
}
```

### Using Local Build

```json
{
  "mcpServers": {
    "bamboohr": {
      "command": "node",
      "args": ["/absolute/path/to/bamboohr-mcp/dist/index.js"],
      "env": {
        "BAMBOOHR_API_KEY": "your_api_key_here",
        "BAMBOOHR_COMPANY_DOMAIN": "your_domain"
      }
    }
  }
}
```

**Important:**
- Restart Claude Desktop after saving configuration changes

---

## Available Tools (71 Total)

### 🧑‍💼 Employee Tools (9 tools)

| Tool | Type | Description |
|------|------|-------------|
| `bamboohr_get_employee_directory` | Read | Get all employees with basic information |
| `bamboohr_get_employee` | Read | Get detailed information for a specific employee |
| `bamboohr_get_employee_files` | Read | Get files associated with an employee |
| `bamboohr_get_employee_enriched` | Read | Get employee with skills, seniority, training data |
| `bamboohr_get_employee_table_rows` | Read | Get table/history data (job, compensation, etc.) |
| `bamboohr_create_employee` | **Create** | Create a new employee record |
| `bamboohr_update_employee` | **Update** | Update employee fields (including custom fields) |
| `bamboohr_add_employee_table_row` | **Create** | Add row to employee table (job info, compensation) |
| `bamboohr_update_employee_table_row` | **Update** | Update existing table row |

#### Employee Create/Update Examples

```
"Create new employee John Doe in Engineering department"
"Update employee 123's job title to Senior Developer"
"Add new compensation record for employee 456"
```

---

### 📅 Time Off Tools (9 tools)

| Tool | Type | Description |
|------|------|-------------|
| `bamboohr_get_time_off_requests` | Read | Get time off requests with filtering |
| `bamboohr_get_whos_out` | Read | Get employees currently out |
| `bamboohr_get_time_off_types` | Read | Get all time off types/categories |
| `bamboohr_get_time_off_policies` | Read | Get all time off policies |
| `bamboohr_get_employee_time_off_policies` | Read | Get policies assigned to an employee |
| `bamboohr_create_time_off_request` | **Create** | Submit a new time off request |
| `bamboohr_change_time_off_request_status` | **Update** | Approve, deny, or cancel a request |
| `bamboohr_adjust_time_off_balance` | **Update** | Adjust PTO balance for an employee |
| `bamboohr_assign_time_off_policy` | **Update** | Assign time off policy to employee |

#### Time Off Management Examples

```
"Create PTO request for employee 123 from Jan 15-17"
"Approve time off request 456"
"Add 5 vacation days to employee 789's balance"
```

---

### 📁 File Management Tools (6 tools)

| Tool | Type | Description |
|------|------|-------------|
| `bamboohr_list_employee_files` | Read | List files for an employee |
| `bamboohr_list_company_files` | Read | List company-wide files |
| `bamboohr_get_file_categories` | Read | Get available file categories |
| `bamboohr_upload_employee_file` | **Create** | Upload file to employee record |
| `bamboohr_upload_employee_photo` | **Create** | Upload employee photo |
| `bamboohr_delete_employee_file` | **Delete** ⚠️ | Delete employee file (requires confirm: true) |

#### File Management Examples

```
"Upload performance review to employee 123's files"
"Update employee 456's profile photo"
"Delete file 789 from employee 123" (requires confirm: true)
```

---

### 🎯 Goals & Performance Tools (7 tools)

| Tool | Type | Description |
|------|------|-------------|
| `bamboohr_get_employee_goals` | Read | Get all goals for an employee |
| `bamboohr_get_goal` | Read | Get specific goal details |
| `bamboohr_get_goal_comments` | Read | Get comments on a goal |
| `bamboohr_create_goal` | **Create** | Create a new goal for employee |
| `bamboohr_update_goal` | **Update** | Update goal details or progress |
| `bamboohr_delete_goal` | **Delete** ⚠️ | Delete a goal (requires confirm: true) |
| `bamboohr_add_goal_comment` | **Create** | Add comment to a goal |

#### Goals Examples

```
"Create Q1 sales target goal for employee 123"
"Update goal 456 progress to 75%"
"Add comment to goal 789: Great progress this month"
```

---

### 📚 Metadata & Training Tools (10 tools)

| Tool | Type | Description |
|------|------|-------------|
| `bamboohr_get_fields` | Read | Get all available employee fields |
| `bamboohr_get_list_field_values` | Read | Get values for a list/dropdown field |
| `bamboohr_get_changed_employees` | Read | Get employees changed since timestamp |
| `bamboohr_get_employee_birthdays` | Read | Get all employee birthdays |
| `bamboohr_get_training_types` | Read | Get available training types |
| `bamboohr_get_training_categories` | Read | Get training categories |
| `bamboohr_add_training_record` | **Create** | Add training record for employee |
| `bamboohr_update_training_record` | **Update** | Update existing training record |
| `bamboohr_delete_training_record` | **Delete** ⚠️ | Delete training record (requires confirm: true) |
| `bamboohr_update_list_field_values` | **Update** | Update list field options |

#### Training Examples

```
"Add Azure AZ-104 certification for employee 123"
"Update training record 456 with completion date"
"Show all available training types"
```

---

### 👥 Applicant Tracking Tools (10 tools)

| Tool | Type | Description |
|------|------|-------------|
| `bamboohr_get_job_summaries` | Read | Get all job openings summary |
| `bamboohr_get_job_details` | Read | Get detailed job information |
| `bamboohr_get_applications` | Read | Get applications for a job |
| `bamboohr_get_application_details` | Read | Get specific application details |
| `bamboohr_get_applicant_statuses` | Read | Get available applicant statuses |
| `bamboohr_create_job_opening` | **Create** | Create a new job posting |
| `bamboohr_create_candidate` | **Create** | Add candidate to job opening |
| `bamboohr_update_applicant_status` | **Update** | Update candidate's application status |
| `bamboohr_add_application_comment` | **Create** | Add comment to an application |
| `bamboohr_get_hiring_leads` | Read | Get hiring leads/managers |

#### Recruiting Examples

```
"Create job opening for Senior Developer position"
"Add candidate John Smith to job posting 123"
"Move applicant 456 to interview stage"
```

---

### 💊 Benefits & Dependents Tools (7 tools)

| Tool | Type | Description |
|------|------|-------------|
| `bamboohr_get_employee_dependents` | Read | Get dependents for an employee |
| `bamboohr_get_all_dependents` | Read | Get all employee dependents company-wide |
| `bamboohr_add_employee_dependent` | **Create** | Add dependent to employee |
| `bamboohr_update_employee_dependent` | **Update** | Update dependent information |
| `bamboohr_get_benefit_plans` | Read | Get available benefit plans |
| `bamboohr_get_employee_benefits` | Read | Get employee's benefit enrollments |
| `bamboohr_get_benefit_coverage_levels` | Read | Get coverage levels for a plan |

#### Benefits Examples

```
"Add spouse dependent for employee 123"
"Show all dependents in the company"
"What benefit plans are available?"
```

---

### ⏱️ Time Tracking Tools (7 tools)

| Tool | Type | Description |
|------|------|-------------|
| `bamboohr_get_timesheet_entries` | Read | Get timesheet entries for date range |
| `bamboohr_get_hour_records` | Read | Get hour records for an employee |
| `bamboohr_get_clock_status` | Read | Get current clock in/out status |
| `bamboohr_clock_in` | **Create** | Clock in an employee |
| `bamboohr_clock_out` | **Create** | Clock out an employee |
| `bamboohr_add_hour_record` | **Create** | Add manual hour record |
| `bamboohr_update_hour_record` | **Update** | Update existing hour record |
| `bamboohr_get_projects` | Read | Get available time tracking projects |

#### Time Tracking Examples

```
"Clock in employee 123"
"Clock out employee 123 with note 'Lunch break'"
"Add 8 hours for employee 456 on project XYZ"
```

---

### 📊 Certifications & Assessments Tools (7 tools)

| Tool | Type | Description |
|------|------|-------------|
| `bamboohr_get_certifications_due` | Read | Query certifications due/expiring across employees |
| `bamboohr_get_employee_certification_summary` | Read | Get certification summary for an employee |
| `bamboohr_get_company_certifications_report` | Read | Company-wide certification compliance report |
| `bamboohr_get_employees_with_assessments_due` | Read | Get employees with assessments due in date range |
| `bamboohr_get_training_records` | Read | Get training records with filtering |
| `bamboohr_get_goals_status_report` | Read | Company-wide goals progress report |
| `bamboohr_get_overdue_assessments` | Read | Get all overdue items across types |

#### Certification & Assessment Examples

```
"Which certifications are expiring in February 2026?"
"Show all Azure certifications due before end of Q1"
"Get company-wide certification compliance by department"
"What assessments are due this month?"
"Show overdue items for employee 123"
"Goal progress report grouped by status"
```

**Note:** BambooHR's API does not expose formal Performance Review endpoints. This module tracks certifications (via custom fields), training, and goals - not review cycles or ratings.

---

## Safety Features

### Destructive Operations Require Confirmation

All DELETE operations and sensitive changes require an explicit `confirm: true` parameter:

```json
{
  "employee_id": "123",
  "file_id": "456",
  "confirm": true  // Required for deletion
}
```

**Operations requiring confirmation:**
- `bamboohr_delete_employee_file`
- `bamboohr_delete_goal`
- `bamboohr_delete_training_record`
- `bamboohr_change_time_off_request_status` (when denying)
- `bamboohr_adjust_time_off_balance` (when reducing balance)

---

## Response Formats

All tools support two output formats via the `response_format` parameter:

### JSON Format
```json
{
  "id": "123",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com"
}
```

### Markdown Format (Default)
```markdown
# Employee: John Doe

**ID:** 123
**Email:** john@example.com
**Job Title:** Software Engineer
```

---

## Example Queries

### Employee Management
```
"Show me the employee directory"
"Get details for employee ID 123"
"Create new employee Jane Smith in Marketing"
"Update employee 456's department to Engineering"
```

### Time Off Management
```
"Who's out today?"
"Show all pending time off requests"
"Approve time off request 789"
"What's employee 123's PTO balance?"
```

### Recruiting
```
"Show all open job positions"
"Create a job posting for Backend Developer"
"Add candidate resume to job opening 456"
"Move applicant to final interview stage"
```

### Goals & Performance
```
"Create Q1 goals for employee 123"
"Show progress on all goals for employee 456"
"Update goal completion to 100%"
```

---

## Troubleshooting

### "Required environment variables not set"
1. Make sure you have a `.env` file in the project root
2. Verify it contains `BAMBOOHR_API_KEY` and `BAMBOOHR_COMPANY_DOMAIN`

### "Authentication failed"
- Verify your API key is correct (no extra spaces)
- Check that the API key hasn't been revoked in BambooHR

### "Access forbidden"
- The user associated with the API key lacks permissions
- Generate a new API key with an admin user
- Some operations require specific BambooHR permissions

### "Failed to call tool" error in Claude Desktop
1. Make sure you're running the latest build: `npm run build`
2. Restart Claude Desktop completely
3. Check the logs for specific error details

### Claude Desktop doesn't show the server
1. Verify the config file path is correct
2. Check JSON is valid
3. Use absolute paths, not relative
4. Completely quit and restart Claude Desktop

---

## Development

### Project Structure
```
bamboohr-mcp-server/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── constants.ts                # API constants
│   ├── types.ts                    # TypeScript types
│   ├── services/
│   │   ├── bamboohr-client.ts      # API client with auth & file uploads
│   │   └── formatting.ts           # Response formatting
│   ├── schemas/
│   │   └── common.ts               # Validation schemas
│   └── tools/
│       ├── employees.ts            # Employee CRUD (9 tools)
│       ├── timeoff.ts              # Time off CRUD (9 tools)
│       ├── files.ts                # File management (6 tools)
│       ├── goals.ts                # Goals & performance (7 tools)
│       ├── metadata.ts             # Metadata & training (10 tools)
│       ├── applicant-tracking.ts   # ATS (10 tools)
│       ├── benefits.ts             # Benefits & dependents (7 tools)
│       ├── time-tracking.ts        # Time tracking (7 tools)
│       └── assessments.ts          # Certifications & assessments (7 tools)
├── dist/                           # Compiled JavaScript (cross-platform)
├── .env                            # Your credentials (don't commit!)
└── README.md
```

### Build Commands
```bash
# Build the project
npm run build

# Development mode (watch for changes)
npm run dev

# Clean build artifacts
npm run clean
```

### Cross-Platform Compatibility

The compiled `dist/` folder runs on any platform with Node.js 18+:
- **macOS** ✓
- **Windows** ✓
- **Linux** ✓

Build once on any platform, run anywhere.

---

## Security Notes

- Never commit API keys to version control
- Store `.env` files securely and add them to `.gitignore`
- The API key has the same permissions as the user who generated it
- Use API keys with appropriate permissions for your use case
- Destructive operations require explicit confirmation

---

## Technical Details

### API Integration
- **Base URL:** `https://{domain}.bamboohr.com/api/v1/`
- **Authentication:** HTTP Basic Auth (API key as username, "x" as password)
- **File Uploads:** Multipart form data for photos and documents
- **Caching:** 5-minute response cache for read operations
- **Retry Logic:** Exponential backoff for rate limits (429/503)

### Tool Response Format
```typescript
{
  content: [{ type: 'text', text: '...' }],
  isError?: boolean
}
```

### Tool Annotations
All tools include MCP annotations:
- `readOnlyHint`: true for read operations, false for writes
- `destructiveHint`: true for delete operations
- `idempotentHint`: true for GET/PUT, false for POST
- `openWorldHint`: true (external API)

---

## Version History

### 1.0.2 - Certifications & Assessment Tracking (Current)
- **71 tools**
- Certification expiration tracking across all employees
- Bulk certification queries with date filtering
- Company-wide certification compliance reporting
- Aggregated assessment views (certifications + training + goals)
- Enhanced goals status reporting
- **Note:** Formal Performance Review cycles remain inaccessible via BambooHR API

### 1.0.1
- Full CRUD operations for employees, time off, goals, training, files, ATS, benefits, and time tracking
- Safety confirmation pattern for destructive operations

### 1.0.0
- Initial release with read operations

---

## Resources

- **BambooHR API Documentation:** https://documentation.bamboohr.com/docs
- **MCP Protocol Documentation:** https://modelcontextprotocol.io

## License

MIT
