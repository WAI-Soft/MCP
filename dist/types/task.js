/**
 * Task data models and interfaces for the Cirvoy-Kiro MCP Integration Server
 *
 * This module defines the TypeScript interfaces for task data models used throughout
 * the system for task synchronization between Kiro and Cirvoy.
 *
 * Requirements: 3.1, 11.1
 */
/**
 * JSON Schema for KiroTask validation
 */
export const kiroTaskSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['path', 'taskId', 'title', 'status', 'specPath'],
    properties: {
        path: {
            type: 'string',
            minLength: 1,
            description: 'Full path to the task file'
        },
        taskId: {
            type: 'string',
            minLength: 1,
            pattern: '^[0-9]+(\\.[0-9]+)*$',
            description: 'Task identifier within the spec'
        },
        title: {
            type: 'string',
            minLength: 1,
            description: 'Task title/description'
        },
        status: {
            type: 'string',
            enum: ['not_started', 'queued', 'in_progress', 'completed'],
            description: 'Current status of the task'
        },
        specPath: {
            type: 'string',
            minLength: 1,
            description: 'Path to the spec directory'
        },
        metadata: {
            type: 'object',
            description: 'Optional metadata'
        }
    },
    additionalProperties: false
};
/**
 * JSON Schema for CirvoyTask validation
 */
export const cirvoyTaskSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['id', 'title', 'status', 'project_id', 'updated_at'],
    properties: {
        id: {
            type: 'number',
            minimum: 1,
            description: 'Unique task ID in Cirvoy system'
        },
        title: {
            type: 'string',
            minLength: 1,
            description: 'Task title'
        },
        status: {
            type: 'string',
            minLength: 1,
            description: 'Task status in Cirvoy format'
        },
        project_id: {
            type: 'number',
            minimum: 1,
            description: 'ID of the project this task belongs to'
        },
        description: {
            type: 'string',
            description: 'Optional task description'
        },
        metadata: {
            type: 'object',
            description: 'Optional metadata'
        },
        updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp of last update in ISO 8601 format'
        }
    },
    additionalProperties: false
};
//# sourceMappingURL=task.js.map