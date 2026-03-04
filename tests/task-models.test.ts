/**
 * Unit tests for task data models and interfaces
 * 
 * Tests the TypeScript interfaces and schemas for task data models.
 * 
 * Requirements: 3.1, 11.1
 */

import { describe, it, expect } from 'vitest';
import {
  KiroTask,
  CirvoyTask,
  TaskMapping,
  ValidationResult,
  ValidationError,
  kiroTaskSchema,
  cirvoyTaskSchema,
  KiroTaskStatus
} from '../src/types/task';

describe('Task Data Models', () => {
  describe('KiroTask interface', () => {
    it('should accept valid KiroTask objects', () => {
      const task: KiroTask = {
        path: '.kiro/specs/my-feature/tasks.md#1.1',
        taskId: '1.1',
        title: 'Implement feature',
        status: 'in_progress',
        specPath: '.kiro/specs/my-feature'
      };
      
      expect(task.path).toBe('.kiro/specs/my-feature/tasks.md#1.1');
      expect(task.taskId).toBe('1.1');
      expect(task.title).toBe('Implement feature');
      expect(task.status).toBe('in_progress');
      expect(task.specPath).toBe('.kiro/specs/my-feature');
    });

    it('should accept KiroTask with metadata', () => {
      const task: KiroTask = {
        path: '.kiro/specs/my-feature/tasks.md#2.1',
        taskId: '2.1',
        title: 'Write tests',
        status: 'completed',
        specPath: '.kiro/specs/my-feature',
        metadata: {
          assignee: 'developer@example.com',
          priority: 'high'
        }
      };
      
      expect(task.metadata).toEqual({
        assignee: 'developer@example.com',
        priority: 'high'
      });
    });

    it('should accept all valid status values', () => {
      const statuses: KiroTaskStatus[] = ['not_started', 'queued', 'in_progress', 'completed'];
      
      statuses.forEach(status => {
        const task: KiroTask = {
          path: '.kiro/specs/test/tasks.md#1.1',
          taskId: '1.1',
          title: 'Test task',
          status,
          specPath: '.kiro/specs/test'
        };
        
        expect(task.status).toBe(status);
      });
    });
  });

  describe('CirvoyTask interface', () => {
    it('should accept valid CirvoyTask objects', () => {
      const task: CirvoyTask = {
        id: 123,
        title: 'Implement feature',
        status: 'in-progress',
        project_id: 456,
        updated_at: '2024-01-15T10:30:00Z'
      };
      
      expect(task.id).toBe(123);
      expect(task.title).toBe('Implement feature');
      expect(task.status).toBe('in-progress');
      expect(task.project_id).toBe(456);
      expect(task.updated_at).toBe('2024-01-15T10:30:00Z');
    });

    it('should accept CirvoyTask with optional fields', () => {
      const task: CirvoyTask = {
        id: 789,
        title: 'Write documentation',
        status: 'completed',
        project_id: 456,
        description: 'Write comprehensive API documentation',
        metadata: {
          tags: ['documentation', 'api'],
          estimatedHours: 8
        },
        updated_at: '2024-01-15T14:00:00Z'
      };
      
      expect(task.description).toBe('Write comprehensive API documentation');
      expect(task.metadata).toEqual({
        tags: ['documentation', 'api'],
        estimatedHours: 8
      });
    });
  });

  describe('TaskMapping interface', () => {
    it('should accept valid TaskMapping objects', () => {
      const mapping: TaskMapping = {
        kiroPath: '.kiro/specs/my-feature/tasks.md#1.1',
        cirvoyId: 123,
        specId: 'my-feature',
        lastSyncedAt: new Date('2024-01-15T10:00:00Z'),
        lastSyncDirection: 'kiro-to-cirvoy',
        version: 1
      };
      
      expect(mapping.kiroPath).toBe('.kiro/specs/my-feature/tasks.md#1.1');
      expect(mapping.cirvoyId).toBe(123);
      expect(mapping.specId).toBe('my-feature');
      expect(mapping.lastSyncDirection).toBe('kiro-to-cirvoy');
      expect(mapping.version).toBe(1);
    });

    it('should accept both sync directions', () => {
      const mapping1: TaskMapping = {
        kiroPath: '.kiro/specs/test/tasks.md#1.1',
        cirvoyId: 100,
        specId: 'test',
        lastSyncedAt: new Date(),
        lastSyncDirection: 'kiro-to-cirvoy',
        version: 1
      };
      
      const mapping2: TaskMapping = {
        kiroPath: '.kiro/specs/test/tasks.md#1.2',
        cirvoyId: 101,
        specId: 'test',
        lastSyncedAt: new Date(),
        lastSyncDirection: 'cirvoy-to-kiro',
        version: 1
      };
      
      expect(mapping1.lastSyncDirection).toBe('kiro-to-cirvoy');
      expect(mapping2.lastSyncDirection).toBe('cirvoy-to-kiro');
    });
  });

  describe('ValidationResult interface', () => {
    it('should accept valid ValidationResult for successful validation', () => {
      const result: ValidationResult = {
        valid: true,
        errors: []
      };
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept ValidationResult with errors', () => {
      const result: ValidationResult = {
        valid: false,
        errors: [
          {
            field: 'title',
            message: 'Title is required',
            value: ''
          },
          {
            field: 'status',
            message: 'Invalid status value',
            value: 'invalid_status'
          }
        ]
      };
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].field).toBe('title');
      expect(result.errors[1].field).toBe('status');
    });
  });

  describe('ValidationError interface', () => {
    it('should accept ValidationError with all fields', () => {
      const error: ValidationError = {
        field: 'taskId',
        message: 'Task ID must match pattern',
        value: 'invalid-id'
      };
      
      expect(error.field).toBe('taskId');
      expect(error.message).toBe('Task ID must match pattern');
      expect(error.value).toBe('invalid-id');
    });

    it('should accept ValidationError without value', () => {
      const error: ValidationError = {
        field: 'metadata',
        message: 'Metadata must be an object'
      };
      
      expect(error.field).toBe('metadata');
      expect(error.message).toBe('Metadata must be an object');
      expect(error.value).toBeUndefined();
    });
  });

  describe('JSON Schemas', () => {
    it('should have valid kiroTaskSchema structure', () => {
      expect(kiroTaskSchema.type).toBe('object');
      expect(kiroTaskSchema.required).toContain('path');
      expect(kiroTaskSchema.required).toContain('taskId');
      expect(kiroTaskSchema.required).toContain('title');
      expect(kiroTaskSchema.required).toContain('status');
      expect(kiroTaskSchema.required).toContain('specPath');
      expect(kiroTaskSchema.properties.status.enum).toEqual([
        'not_started',
        'queued',
        'in_progress',
        'completed'
      ]);
    });

    it('should have valid cirvoyTaskSchema structure', () => {
      expect(cirvoyTaskSchema.type).toBe('object');
      expect(cirvoyTaskSchema.required).toContain('id');
      expect(cirvoyTaskSchema.required).toContain('title');
      expect(cirvoyTaskSchema.required).toContain('status');
      expect(cirvoyTaskSchema.required).toContain('project_id');
      expect(cirvoyTaskSchema.required).toContain('updated_at');
      expect(cirvoyTaskSchema.properties.id.minimum).toBe(1);
      expect(cirvoyTaskSchema.properties.project_id.minimum).toBe(1);
    });
  });
});
