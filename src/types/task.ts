/**
 * Task data models and interfaces for the Cirvoy-Kiro MCP Integration Server
 * 
 * This module defines the TypeScript interfaces for task data models used throughout
 * the system for task synchronization between Kiro and Cirvoy.
 * 
 * Requirements: 3.1, 11.1
 */

/**
 * Task status values used in Kiro IDE
 */
export type KiroTaskStatus = 'not_started' | 'queued' | 'in_progress' | 'completed';

/**
 * Kiro task representation
 * 
 * Represents a task as it exists in Kiro IDE's task management system.
 * Tasks are stored in tasks.md files within spec directories.
 */
export interface KiroTask {
  /** Full path to the task file (e.g., .kiro/specs/my-feature/tasks.md#1.1) */
  path: string;
  
  /** Task identifier within the spec (e.g., "1.1", "2.3.1") */
  taskId: string;
  
  /** Task title/description */
  title: string;
  
  /** Current status of the task */
  status: KiroTaskStatus;
  
  /** Path to the spec directory containing this task */
  specPath: string;
  
  /** Optional metadata for additional task information */
  metadata?: Record<string, any>;
}

/**
 * Cirvoy task representation
 * 
 * Represents a task as it exists in the Cirvoy project management system.
 * Tasks are stored in Cirvoy's MySQL database.
 */
export interface CirvoyTask {
  /** Unique task ID in Cirvoy system */
  id: number;
  
  /** Task title */
  title: string;
  
  /** Task status (Cirvoy format, e.g., "in-progress", "completed") */
  status: string;
  
  /** ID of the project this task belongs to */
  project_id: number;
  
  /** Optional task description */
  description?: string;
  
  /** Optional metadata for additional task information */
  metadata?: Record<string, any>;
  
  /** Timestamp of last update in ISO 8601 format */
  updated_at: string;
}

/**
 * Task mapping between Kiro and Cirvoy systems
 * 
 * Maintains the relationship between a Kiro task and its corresponding
 * Cirvoy task for bidirectional synchronization.
 */
export interface TaskMapping {
  /** Kiro task path (unique identifier in Kiro) */
  kiroPath: string;
  
  /** Cirvoy task ID (unique identifier in Cirvoy) */
  cirvoyId: number;
  
  /** Spec ID that this task belongs to */
  specId: string;
  
  /** Timestamp of the last successful synchronization */
  lastSyncedAt: Date;
  
  /** Direction of the last sync operation */
  lastSyncDirection: 'kiro-to-cirvoy' | 'cirvoy-to-kiro';
  
  /** Version number for optimistic locking */
  version: number;
}

/**
 * Validation result for task data
 * 
 * Contains the result of validating a task object against its schema,
 * including any validation errors that were found.
 */
export interface ValidationResult {
  /** Whether the validation passed */
  valid: boolean;
  
  /** Array of validation error messages (empty if valid) */
  errors: ValidationError[];
}

/**
 * Individual validation error
 */
export interface ValidationError {
  /** Field path that failed validation (e.g., "title", "status") */
  field: string;
  
  /** Human-readable error message */
  message: string;
  
  /** The invalid value that was provided */
  value?: any;
}

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
