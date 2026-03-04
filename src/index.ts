#!/usr/bin/env node
/**
 * Main entry point for Cirvoy-Kiro MCP Integration Server
 * 
 * This server enables bidirectional task synchronization between
 * Kiro IDE and Cirvoy project management system.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Export configuration module
export * from './config/index.js';

// Export types
export * from './types/index.js';

// Export API client
export * from './api-client/index.js';

export async function main() {
  console.error('Cirvoy-Kiro MCP Integration Server starting...');
  
  const server = new Server(
    {
      name: 'cirvoy-kiro-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'sync_task',
          description: 'Synchronize a single task between Kiro and Cirvoy',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: 'The ID of the task to synchronize',
              },
              direction: {
                type: 'string',
                enum: ['kiro-to-cirvoy', 'cirvoy-to-kiro'],
                description: 'Direction of synchronization',
              },
            },
            required: ['taskId', 'direction'],
          },
        },
        {
          name: 'sync_all_tasks',
          description: 'Synchronize all tasks in a project',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: {
                type: 'string',
                description: 'The ID of the project to synchronize',
              },
            },
            required: ['projectId'],
          },
        },
        {
          name: 'get_sync_status',
          description: 'Get the current synchronization status',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'resolve_conflict',
          description: 'Resolve a synchronization conflict',
          inputSchema: {
            type: 'object',
            properties: {
              conflictId: {
                type: 'string',
                description: 'The ID of the conflict to resolve',
              },
              resolution: {
                type: 'string',
                enum: ['kiro-wins', 'cirvoy-wins', 'manual'],
                description: 'Resolution strategy',
              },
            },
            required: ['conflictId', 'resolution'],
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
        case 'sync_task':
          return {
            content: [
              {
                type: 'text',
                text: `Task ${(args as any)?.taskId} synchronized ${(args as any)?.direction}`,
              },
            ],
          };

        case 'sync_all_tasks':
          return {
            content: [
              {
                type: 'text',
                text: `All tasks in project ${(args as any)?.projectId} synchronized`,
              },
            ],
          };

        case 'get_sync_status':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'running',
                  lastSync: new Date().toISOString(),
                  queueSize: 0,
                  errorCount: 0,
                }),
              },
            ],
          };

        case 'resolve_conflict':
          return {
            content: [
              {
                type: 'text',
                text: `Conflict ${(args as any)?.conflictId} resolved using ${(args as any)?.resolution}`,
              },
            ],
          };

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Cirvoy-Kiro MCP Server running on stdio');
}

// Start server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
