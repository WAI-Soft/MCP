#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { SyncEngine } from './sync-engine.js';

const CIRVOY_BASE_URL = process.env.CIRVOY_BASE_URL || 'https://cirvoy.com/api/kiro';
const CIRVOY_API_TOKEN = process.env.CIRVOY_API_TOKEN || '';
const CIRVOY_PROJECT_ID = process.env.CIRVOY_PROJECT_ID || '';
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || process.cwd();

const api = axios.create({
  baseURL: CIRVOY_BASE_URL,
  headers: {
    'Authorization': `Bearer ${CIRVOY_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

let syncEngine: SyncEngine | null = null;

export async function main() {
  console.error('🚀 Cirvoy-Kiro MCP Server starting...');

  if (!CIRVOY_API_TOKEN) {
    console.error('❌ CIRVOY_API_TOKEN is required');
    process.exit(1);
  }

  // Start auto-sync if project ID is configured
  if (CIRVOY_PROJECT_ID) {
    syncEngine = new SyncEngine({
      cirvoyBaseUrl: CIRVOY_BASE_URL,
      cirvoyApiToken: CIRVOY_API_TOKEN,
      cirvoyProjectId: CIRVOY_PROJECT_ID,
      workspaceDir: WORKSPACE_DIR,
    });
    
    // Start sync engine in background (don't block MCP server startup)
    syncEngine.start().catch(err => {
      console.error('⚠️ Sync engine failed to start:', err.message);
      console.error('ℹ️  MCP server will continue running. Manual tools are still available.');
    });
  } else {
    console.error('ℹ️  CIRVOY_PROJECT_ID not set - auto-sync disabled. Manual tools still available.');
  }

  const server = new Server(
    { name: 'cirvoy-kiro-mcp', version: '1.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'get_task',
        description: 'Get a single task by ID from Cirvoy',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'number', description: 'Task ID' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'update_task',
        description: 'Update a task in Cirvoy (status, title, priority, etc)',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'number', description: 'Task ID' },
            title: { type: 'string', description: 'Task title' },
            description: { type: 'string', description: 'Task description' },
            status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'in_review', 'done'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            progress: { type: 'number', minimum: 0, maximum: 100 },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'create_task',
        description: 'Create a new task in Cirvoy',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'Project ID' },
            title: { type: 'string', description: 'Task title' },
            description: { type: 'string', description: 'Task description' },
            status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'in_review', 'done'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          },
          required: ['projectId', 'title'],
        },
      },
      {
        name: 'list_tasks',
        description: 'List tasks for a project from Cirvoy',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'Project ID' },
            status: { type: 'string', description: 'Filter by status' },
          },
        },
      },
      {
        name: 'batch_update_tasks',
        description: 'Update multiple tasks at once in Cirvoy',
        inputSchema: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  status: { type: 'string' },
                  priority: { type: 'string' },
                  progress: { type: 'number' },
                },
                required: ['id'],
              },
            },
          },
          required: ['tasks'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'get_task': {
          const res = await api.get(`/tasks/${(args as any).taskId}`);
          return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
        }

        case 'update_task': {
          const { taskId, ...data } = args as any;
          const res = await api.put(`/tasks/${taskId}`, data);
          return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
        }

        case 'create_task': {
          const res = await api.post('/tasks', args);
          return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
        }

        case 'list_tasks': {
          const res = await api.get('/tasks', { params: args });
          return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
        }

        case 'batch_update_tasks': {
          const res = await api.post('/tasks/batch', args);
          return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || String(error);
      return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
    }
  });

  // Graceful shutdown
  const shutdown = () => {
    console.error('Shutting down...');
    syncEngine?.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✅ Cirvoy-Kiro MCP Server running');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
