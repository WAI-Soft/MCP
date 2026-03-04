#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

// Export modules
export * from './config/index.js';
export * from './types/index.js';
export * from './api-client/index.js';

const CIRVOY_BASE_URL = process.env.CIRVOY_BASE_URL || 'https://cirvoy.com/api/kiro';
const CIRVOY_API_TOKEN = process.env.CIRVOY_API_TOKEN || '';

// Create axios instance
const api = axios.create({
  baseURL: CIRVOY_BASE_URL,
  headers: {
    'Authorization': `Bearer ${CIRVOY_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export async function main() {
  console.error('🚀 Cirvoy-Kiro MCP Server starting...');
  
  if (!CIRVOY_API_TOKEN) {
    console.error('❌ Error: CIRVOY_API_TOKEN is required');
    process.exit(1);
  }

  const server = new Server(
    { name: 'cirvoy-kiro-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
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
          description: 'Update a task in Cirvoy',
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
          description: 'List tasks for a project',
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
          description: 'Update multiple tasks at once',
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
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'get_task': {
          const response = await api.get(`/tasks/${(args as any).taskId}`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            }],
          };
        }

        case 'update_task': {
          const { taskId, ...updateData } = args as any;
          const response = await api.put(`/tasks/${taskId}`, updateData);
          return {
            content: [{
              type: 'text',
              text: `✅ Task ${taskId} updated successfully\n${JSON.stringify(response.data, null, 2)}`,
            }],
          };
        }

        case 'create_task': {
          const response = await api.post('/tasks', args);
          return {
            content: [{
              type: 'text',
              text: `✅ Task created successfully\n${JSON.stringify(response.data, null, 2)}`,
            }],
          };
        }

        case 'list_tasks': {
          const params = args as any;
          const response = await api.get('/tasks', { params });
          const tasks = response.data.data || [];
          return {
            content: [{
              type: 'text',
              text: `Found ${tasks.length} tasks\n${JSON.stringify(tasks, null, 2)}`,
            }],
          };
        }

        case 'batch_update_tasks': {
          const response = await api.post('/tasks/batch', args);
          return {
            content: [{
              type: 'text',
              text: `✅ Batch update completed\n${JSON.stringify(response.data, null, 2)}`,
            }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || String(error);
      console.error(`Error in ${name}:`, errorMsg);
      return {
        content: [{
          type: 'text',
          text: `❌ Error: ${errorMsg}`,
        }],
        isError: true,
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✅ Cirvoy-Kiro MCP Server running');
}

// Start if main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
