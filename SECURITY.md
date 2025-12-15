# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by creating a private security advisory on GitHub or by emailing the maintainer directly.

**Please do NOT create public GitHub issues for security vulnerabilities.**

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- Initial response: Within 48 hours
- Status update: Within 7 days
- Fix timeline: Depends on severity

## Security Best Practices

When using this MCP server:

1. **Never commit API keys** - Use environment variables or Claude Desktop's config
2. **Use appropriate API key permissions** - Create API keys with minimal required permissions
3. **Rotate keys regularly** - Especially if you suspect they may have been exposed
4. **Review destructive operations** - All DELETE operations require explicit `confirm: true`

## Dependencies

We regularly update dependencies to patch known vulnerabilities. Run `npm audit` to check for issues.
