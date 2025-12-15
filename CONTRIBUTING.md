# Contributing to BambooHR MCP Server

Thank you for your interest in contributing! This document provides guidelines for contributing to the BambooHR MCP Server.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm
- A BambooHR account with API access (for testing)

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/bamboohr-mcp.git
   cd bamboohr-mcp
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file with your BambooHR credentials:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```
5. Build the project:
   ```bash
   npm run build
   ```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Linting

```bash
# Check for lint errors
npm run lint

# Auto-fix lint errors
npm run lint:fix
```

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/twentytwokhz/bamboohr-mcp/issues)
2. If not, create a new issue using the bug report template
3. Include:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Node.js version
   - Operating system

### Suggesting Features

1. Check if the feature has been suggested in [Issues](https://github.com/twentytwokhz/bamboohr-mcp/issues)
2. Create a new issue using the feature request template
3. Explain the use case and why it would be valuable

### Submitting Pull Requests

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Ensure code passes linting: `npm run lint`
6. Commit your changes with a descriptive message
7. Push to your fork and create a Pull Request

## Code Style

- Use TypeScript for all source files
- Follow existing code patterns and conventions
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small

## Adding New Tools

When adding new BambooHR API tools:

1. Add the tool registration in the appropriate file under `src/tools/`
2. Follow the existing pattern for tool annotations:
   - `readOnlyHint`: true for GET operations
   - `destructiveHint`: true for DELETE operations
   - `idempotentHint`: true for GET/PUT, false for POST
3. Add safety confirmation (`confirm: true`) for destructive operations
4. Support both JSON and Markdown response formats
5. Update the README with the new tool documentation

## Tool Response Format

All tools should return MCP-compliant responses:

```typescript
{
  content: [{ type: 'text', text: '...' }],
  isError?: boolean
}
```

## Commit Messages

- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove, etc.)
- Keep the first line under 72 characters
- Reference issues when applicable (e.g., "Fix #123")

## Questions?

Feel free to open an issue for any questions about contributing.

Thank you for helping improve the BambooHR MCP Server!
