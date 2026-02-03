#!/usr/bin/env node

// BambooHR MCP Server - Main Entry Point
// Full CRUD operations for BambooHR API integration

import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';
import { BambooHRClient } from './services/bamboohr-client.js';

// Tool modules
import { registerEmployeeTools } from './tools/employees.js';
import { registerTimeOffTools } from './tools/timeoff.js';
import { registerMetadataTools } from './tools/metadata.js';
import { registerFileTools } from './tools/files.js';
import { registerGoalTools } from './tools/goals.js';
import { registerApplicantTrackingTools } from './tools/applicant-tracking.js';
import { registerBenefitsTools } from './tools/benefits.js';
import { registerTimeTrackingTools } from './tools/time-tracking.js';
import { registerAssessmentTools } from './tools/assessments.js';

// Initialize MCP Server
const server = new McpServer({
  name: '@twentytwokhz/bamboohr-mcp',
  version: '1.0.2'
});

// Get configuration from environment variables
const apiKey = process.env.BAMBOOHR_API_KEY;
const companyDomain = process.env.BAMBOOHR_COMPANY_DOMAIN;

if (!apiKey || !companyDomain) {
  console.error('ERROR: Required environment variables not set.');
  console.error('Please set:');
  console.error('  - BAMBOOHR_API_KEY: Your BambooHR API key');
  console.error('  - BAMBOOHR_COMPANY_DOMAIN: Your company subdomain (e.g., "mycompany" from mycompany.bamboohr.com)');
  process.exit(1);
}

// Initialize BambooHR client
const bambooClient = new BambooHRClient({
  apiKey,
  companyDomain
});

// Register all tool sets
try {
  console.error('Registering employee tools (CRUD)...');
  registerEmployeeTools(server, bambooClient);

  console.error('Registering time off tools (CRUD)...');
  registerTimeOffTools(server, bambooClient);

  console.error('Registering metadata and training tools...');
  registerMetadataTools(server, bambooClient);

  console.error('Registering file management tools...');
  registerFileTools(server, bambooClient);

  console.error('Registering goals and performance tools...');
  registerGoalTools(server, bambooClient);

  console.error('Registering applicant tracking tools...');
  registerApplicantTrackingTools(server, bambooClient);

  console.error('Registering benefits and dependents tools...');
  registerBenefitsTools(server, bambooClient);

  console.error('Registering time tracking tools...');
  registerTimeTrackingTools(server, bambooClient);

  console.error('Registering certifications & assessments tools...');
  registerAssessmentTools(server, bambooClient);

  console.error('All tools registered successfully!');
} catch (error) {
  console.error('Failed to register tools:', error);
  process.exit(1);
}

// Transport setup functions

async function runStdio(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('BambooHR MCP Server running on stdio');
}

async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', server: '@twentytwokhz/bamboohr-mcp', version: '1.0.2' });
  });

  // MCP endpoint
  app.post('/mcp', async (req, res) => {
    // Create a new transport for each request (stateless, prevents ID collisions)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    res.on('close', () => transport.close());

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || '3000');
  app.listen(port, () => {
    console.error(`BambooHR MCP Server running on http://localhost:${port}/mcp`);
    console.error(`Health check available at http://localhost:${port}/health`);
  });
}

// Main entry point
async function main(): Promise<void> {
  const transport = process.env.TRANSPORT || 'stdio';

  if (transport === 'http') {
    await runHTTP();
  } else {
    await runStdio();
  }
}

// Start server
main().catch(error => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
