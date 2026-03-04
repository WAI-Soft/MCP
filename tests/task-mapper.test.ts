import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeDatabase, closeDatabase } from '../src/database/schema';
import { createTaskMapper, TaskMapper } from '../src/task-mapper';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Task Mapper CRUD Operations', () => {
  let tempDir: string;
  let dbPath: string;
  let db: Database.Database;
  let mapper: TaskMapper;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'cirvoy-test-'));
    dbPath = join(tempDir, 'test.db');
    db = initializeDatabase({ dbPath });
    mapper = createTaskMapper(db);
  });

  afterEach(() => {
    if (db) {
      closeDatabase(db);
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('createMapping', () => {
    it('should create a new task mapping with all required fields', () => {
      mapper.createMapping(
        '.kiro/specs/my-feature/tasks.md#1.1',
        123,
        'my-feature',
        'kiro-to-cirvoy'
      );

      const mapping = mapper.getMapping('.kiro/specs/my-feature/tasks.md#1.1');
      expect(mapping).not.toBeNull();
      expect(mapping!.kiroPath).toBe('.kiro/specs/my-feature/tasks.md#1.1');
      expect(mapping!.cirvoyId).toBe(123);
      expect(mapping!.specId).toBe('my-feature');
      expect(mapping!.lastSyncDirection).toBe('kiro-to-cirvoy');
      expect(mapping!.version).toBe(1);
      expect(mapping!.lastSyncedAt).toBeInstanceOf(Date);
    });

    it('should default to kiro-to-cirvoy direction when not specified', () => {
      mapper.createMapping(
        '.kiro/specs/my-feature/tasks.md#1.1',
        123,
        'my-feature'
      );

      const mapping = mapper.getMapping('.kiro/specs/my-feature/tasks.md#1.1');
      expect(mapping!.lastSyncDirection).toBe('kiro-to-cirvoy');
    });

    it('should throw error when creating mapping with duplicate kiro_path', () => {
      mapper.createMapping(
        '.kiro/specs/my-feature/tasks.md#1.1',
        123,
        'my-feature'
      );

      expect(() => {
        mapper.createMapping(
          '.kiro/specs/my-feature/tasks.md#1.1',
          456, // Different cirvoy_id
          'my-feature'
        );
      }).toThrow('Mapping already exists for Kiro path');
    });

    it('should throw error when creating mapping with duplicate cirvoy_id', () => {
      mapper.createMapping(
        '.kiro/specs/my-feature/tasks.md#1.1',
        123,
        'my-feature'
      );

      expect(() => {
        mapper.createMapping(
          '.kiro/specs/my-feature/tasks.md#2.1', // Different path
          123, // Same cirvoy_id
          'my-feature'
        );
      }).toThrow('Mapping already exists for Cirvoy ID');
    });

    it('should allow creating multiple mappings with unique paths and IDs', () => {
      mapper.createMapping('.kiro/specs/feature-a/tasks.md#1.1', 100, 'feature-a');
      mapper.createMapping('.kiro/specs/feature-a/tasks.md#1.2', 101, 'feature-a');
      mapper.createMapping('.kiro/specs/feature-b/tasks.md#1.1', 200, 'feature-b');

      expect(mapper.getMapping('.kiro/specs/feature-a/tasks.md#1.1')).not.toBeNull();
      expect(mapper.getMapping('.kiro/specs/feature-a/tasks.md#1.2')).not.toBeNull();
      expect(mapper.getMapping('.kiro/specs/feature-b/tasks.md#1.1')).not.toBeNull();
    });

    it('should handle Unicode characters in kiro_path', () => {
      const unicodePath = '.kiro/specs/مشروع-عربي/tasks.md#1.1';
      mapper.createMapping(unicodePath, 123, 'arabic-project');

      const mapping = mapper.getMapping(unicodePath);
      expect(mapping).not.toBeNull();
      expect(mapping!.kiroPath).toBe(unicodePath);
    });
  });

  describe('getMapping', () => {
    beforeEach(() => {
      // Create test mappings
      mapper.createMapping('.kiro/specs/feature-a/tasks.md#1.1', 100, 'feature-a');
      mapper.createMapping('.kiro/specs/feature-a/tasks.md#1.2', 101, 'feature-a');
      mapper.createMapping('.kiro/specs/feature-b/tasks.md#1.1', 200, 'feature-b');
    });

    it('should retrieve existing mapping by kiro_path', () => {
      const mapping = mapper.getMapping('.kiro/specs/feature-a/tasks.md#1.1');
      
      expect(mapping).not.toBeNull();
      expect(mapping!.kiroPath).toBe('.kiro/specs/feature-a/tasks.md#1.1');
      expect(mapping!.cirvoyId).toBe(100);
      expect(mapping!.specId).toBe('feature-a');
    });

    it('should return null for non-existent kiro_path', () => {
      const mapping = mapper.getMapping('.kiro/specs/non-existent/tasks.md#1.1');
      expect(mapping).toBeNull();
    });

    it('should return mapping with correct data types', () => {
      const mapping = mapper.getMapping('.kiro/specs/feature-a/tasks.md#1.1');
      
      expect(mapping).not.toBeNull();
      expect(typeof mapping!.kiroPath).toBe('string');
      expect(typeof mapping!.cirvoyId).toBe('number');
      expect(typeof mapping!.specId).toBe('string');
      expect(mapping!.lastSyncedAt).toBeInstanceOf(Date);
      expect(typeof mapping!.lastSyncDirection).toBe('string');
      expect(typeof mapping!.version).toBe('number');
    });

    it('should perform query in less than 100ms (performance requirement)', () => {
      // Create many mappings to test performance
      for (let i = 0; i < 1000; i++) {
        mapper.createMapping(
          `.kiro/specs/perf-test/tasks.md#${i}`,
          1000 + i,
          'perf-test'
        );
      }

      const startTime = performance.now();
      const mapping = mapper.getMapping('.kiro/specs/perf-test/tasks.md#500');
      const endTime = performance.now();
      
      const queryTime = endTime - startTime;
      expect(mapping).not.toBeNull();
      expect(queryTime).toBeLessThan(100); // Requirement 3.3: <100ms
    });

    it('should handle empty string path', () => {
      const mapping = mapper.getMapping('');
      expect(mapping).toBeNull();
    });
  });

  describe('getMappingByCirvoyId', () => {
    beforeEach(() => {
      mapper.createMapping('.kiro/specs/feature-a/tasks.md#1.1', 100, 'feature-a');
      mapper.createMapping('.kiro/specs/feature-a/tasks.md#1.2', 101, 'feature-a');
      mapper.createMapping('.kiro/specs/feature-b/tasks.md#1.1', 200, 'feature-b');
    });

    it('should retrieve existing mapping by cirvoy_id', () => {
      const mapping = mapper.getMappingByCirvoyId(100);
      
      expect(mapping).not.toBeNull();
      expect(mapping!.kiroPath).toBe('.kiro/specs/feature-a/tasks.md#1.1');
      expect(mapping!.cirvoyId).toBe(100);
      expect(mapping!.specId).toBe('feature-a');
    });

    it('should return null for non-existent cirvoy_id', () => {
      const mapping = mapper.getMappingByCirvoyId(999);
      expect(mapping).toBeNull();
    });

    it('should perform query in less than 100ms (performance requirement)', () => {
      // Create many mappings to test performance
      for (let i = 0; i < 1000; i++) {
        mapper.createMapping(
          `.kiro/specs/perf-test/tasks.md#${i}`,
          2000 + i,
          'perf-test'
        );
      }

      const startTime = performance.now();
      const mapping = mapper.getMappingByCirvoyId(2500);
      const endTime = performance.now();
      
      const queryTime = endTime - startTime;
      expect(mapping).not.toBeNull();
      expect(queryTime).toBeLessThan(100); // Requirement 3.3: <100ms
    });

    it('should handle negative cirvoy_id', () => {
      const mapping = mapper.getMappingByCirvoyId(-1);
      expect(mapping).toBeNull();
    });

    it('should handle zero cirvoy_id', () => {
      const mapping = mapper.getMappingByCirvoyId(0);
      expect(mapping).toBeNull();
    });
  });

  describe('updateMapping', () => {
    beforeEach(() => {
      mapper.createMapping('.kiro/specs/feature-a/tasks.md#1.1', 100, 'feature-a');
      mapper.createMapping('.kiro/specs/feature-a/tasks.md#1.2', 101, 'feature-a');
    });

    it('should update kiro_path when task is relocated', () => {
      const oldPath = '.kiro/specs/feature-a/tasks.md#1.1';
      const newPath = '.kiro/specs/feature-a-renamed/tasks.md#1.1';
      
      mapper.updateMapping(oldPath, newPath);
      
      // Old path should not exist
      expect(mapper.getMapping(oldPath)).toBeNull();
      
      // New path should have the same cirvoy_id
      const mapping = mapper.getMapping(newPath);
      expect(mapping).not.toBeNull();
      expect(mapping!.cirvoyId).toBe(100);
      expect(mapping!.specId).toBe('feature-a');
    });

    it('should throw error when old path does not exist', () => {
      expect(() => {
        mapper.updateMapping(
          '.kiro/specs/non-existent/tasks.md#1.1',
          '.kiro/specs/new-path/tasks.md#1.1'
        );
      }).toThrow('No mapping found for path');
    });

    it('should throw error when new path already exists', () => {
      expect(() => {
        mapper.updateMapping(
          '.kiro/specs/feature-a/tasks.md#1.1',
          '.kiro/specs/feature-a/tasks.md#1.2' // Already exists
        );
      }).toThrow('Mapping already exists for new path');
    });

    it('should preserve cirvoy_id and other metadata during relocation', () => {
      const oldPath = '.kiro/specs/feature-a/tasks.md#1.1';
      const newPath = '.kiro/specs/feature-a-renamed/tasks.md#1.1';
      
      const originalMapping = mapper.getMapping(oldPath);
      
      mapper.updateMapping(oldPath, newPath);
      
      const updatedMapping = mapper.getMapping(newPath);
      expect(updatedMapping!.cirvoyId).toBe(originalMapping!.cirvoyId);
      expect(updatedMapping!.specId).toBe(originalMapping!.specId);
      expect(updatedMapping!.lastSyncDirection).toBe(originalMapping!.lastSyncDirection);
    });

    it('should handle Unicode characters in new path', () => {
      const oldPath = '.kiro/specs/feature-a/tasks.md#1.1';
      const newPath = '.kiro/specs/مشروع-عربي/tasks.md#1.1';
      
      mapper.updateMapping(oldPath, newPath);
      
      const mapping = mapper.getMapping(newPath);
      expect(mapping).not.toBeNull();
      expect(mapping!.kiroPath).toBe(newPath);
    });

    it('should allow updating to same path (no-op)', () => {
      const path = '.kiro/specs/feature-a/tasks.md#1.1';
      
      // This should succeed but not change anything
      mapper.updateMapping(path, path);
      
      const mapping = mapper.getMapping(path);
      expect(mapping).not.toBeNull();
      expect(mapping!.cirvoyId).toBe(100);
    });
  });

  describe('deleteMapping', () => {
    beforeEach(() => {
      mapper.createMapping('.kiro/specs/feature-a/tasks.md#1.1', 100, 'feature-a');
      mapper.createMapping('.kiro/specs/feature-a/tasks.md#1.2', 101, 'feature-a');
    });

    it('should delete existing mapping', () => {
      const result = mapper.deleteMapping('.kiro/specs/feature-a/tasks.md#1.1');
      
      expect(result).toBe(true);
      expect(mapper.getMapping('.kiro/specs/feature-a/tasks.md#1.1')).toBeNull();
    });

    it('should return false when deleting non-existent mapping', () => {
      const result = mapper.deleteMapping('.kiro/specs/non-existent/tasks.md#1.1');
      expect(result).toBe(false);
    });

    it('should allow re-creating mapping after deletion', () => {
      const path = '.kiro/specs/feature-a/tasks.md#1.1';
      
      mapper.deleteMapping(path);
      expect(mapper.getMapping(path)).toBeNull();
      
      // Should be able to create new mapping with same path
      mapper.createMapping(path, 999, 'feature-a');
      
      const mapping = mapper.getMapping(path);
      expect(mapping).not.toBeNull();
      expect(mapping!.cirvoyId).toBe(999);
    });

    it('should allow re-using cirvoy_id after deletion', () => {
      const path = '.kiro/specs/feature-a/tasks.md#1.1';
      const cirvoyId = 100;
      
      mapper.deleteMapping(path);
      
      // Should be able to create new mapping with same cirvoy_id
      mapper.createMapping('.kiro/specs/new-path/tasks.md#1.1', cirvoyId, 'new-feature');
      
      const mapping = mapper.getMappingByCirvoyId(cirvoyId);
      expect(mapping).not.toBeNull();
      expect(mapping!.kiroPath).toBe('.kiro/specs/new-path/tasks.md#1.1');
    });

    it('should not affect other mappings when deleting one', () => {
      mapper.deleteMapping('.kiro/specs/feature-a/tasks.md#1.1');
      
      // Other mapping should still exist
      const mapping = mapper.getMapping('.kiro/specs/feature-a/tasks.md#1.2');
      expect(mapping).not.toBeNull();
      expect(mapping!.cirvoyId).toBe(101);
    });
  });

  describe('getMappingsBySpec', () => {
    beforeEach(() => {
      mapper.createMapping('.kiro/specs/feature-a/tasks.md#1.1', 100, 'feature-a');
      mapper.createMapping('.kiro/specs/feature-a/tasks.md#1.2', 101, 'feature-a');
      mapper.createMapping('.kiro/specs/feature-a/tasks.md#2.1', 102, 'feature-a');
      mapper.createMapping('.kiro/specs/feature-b/tasks.md#1.1', 200, 'feature-b');
    });

    it('should retrieve all mappings for a spec', () => {
      const mappings = mapper.getMappingsBySpec('feature-a');
      
      expect(mappings).toHaveLength(3);
      expect(mappings.every(m => m.specId === 'feature-a')).toBe(true);
    });

    it('should return empty array for spec with no mappings', () => {
      const mappings = mapper.getMappingsBySpec('non-existent');
      expect(mappings).toHaveLength(0);
    });

    it('should return mappings sorted by kiro_path', () => {
      const mappings = mapper.getMappingsBySpec('feature-a');
      
      expect(mappings[0].kiroPath).toBe('.kiro/specs/feature-a/tasks.md#1.1');
      expect(mappings[1].kiroPath).toBe('.kiro/specs/feature-a/tasks.md#1.2');
      expect(mappings[2].kiroPath).toBe('.kiro/specs/feature-a/tasks.md#2.1');
    });

    it('should not include mappings from other specs', () => {
      const mappings = mapper.getMappingsBySpec('feature-a');
      
      expect(mappings.every(m => m.specId === 'feature-a')).toBe(true);
      expect(mappings.some(m => m.cirvoyId === 200)).toBe(false);
    });
  });

  describe('updateSyncMetadata', () => {
    beforeEach(() => {
      mapper.createMapping('.kiro/specs/feature-a/tasks.md#1.1', 100, 'feature-a');
    });

    it('should update last_synced_at timestamp', async () => {
      const originalMapping = mapper.getMapping('.kiro/specs/feature-a/tasks.md#1.1');
      const originalTime = originalMapping!.lastSyncedAt.getTime();
      
      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      mapper.updateSyncMetadata('.kiro/specs/feature-a/tasks.md#1.1', 'cirvoy-to-kiro');
      
      const updatedMapping = mapper.getMapping('.kiro/specs/feature-a/tasks.md#1.1');
      expect(updatedMapping!.lastSyncedAt.getTime()).toBeGreaterThan(originalTime);
    });

    it('should update last_sync_direction', () => {
      mapper.updateSyncMetadata('.kiro/specs/feature-a/tasks.md#1.1', 'cirvoy-to-kiro');
      
      const mapping = mapper.getMapping('.kiro/specs/feature-a/tasks.md#1.1');
      expect(mapping!.lastSyncDirection).toBe('cirvoy-to-kiro');
    });

    it('should increment version number', () => {
      const originalMapping = mapper.getMapping('.kiro/specs/feature-a/tasks.md#1.1');
      expect(originalMapping!.version).toBe(1);
      
      mapper.updateSyncMetadata('.kiro/specs/feature-a/tasks.md#1.1', 'cirvoy-to-kiro');
      
      const updatedMapping = mapper.getMapping('.kiro/specs/feature-a/tasks.md#1.1');
      expect(updatedMapping!.version).toBe(2);
    });

    it('should throw error when path does not exist', () => {
      expect(() => {
        mapper.updateSyncMetadata('.kiro/specs/non-existent/tasks.md#1.1', 'kiro-to-cirvoy');
      }).toThrow('No mapping found for path');
    });

    it('should handle multiple updates incrementing version', () => {
      mapper.updateSyncMetadata('.kiro/specs/feature-a/tasks.md#1.1', 'cirvoy-to-kiro');
      mapper.updateSyncMetadata('.kiro/specs/feature-a/tasks.md#1.1', 'kiro-to-cirvoy');
      mapper.updateSyncMetadata('.kiro/specs/feature-a/tasks.md#1.1', 'cirvoy-to-kiro');
      
      const mapping = mapper.getMapping('.kiro/specs/feature-a/tasks.md#1.1');
      expect(mapping!.version).toBe(4); // Started at 1, incremented 3 times
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long kiro_path', () => {
      const longPath = '.kiro/specs/' + 'a'.repeat(500) + '/tasks.md#1.1';
      mapper.createMapping(longPath, 100, 'long-spec');
      
      const mapping = mapper.getMapping(longPath);
      expect(mapping).not.toBeNull();
      expect(mapping!.kiroPath).toBe(longPath);
    });

    it('should handle very large cirvoy_id', () => {
      const largeId = Number.MAX_SAFE_INTEGER;
      mapper.createMapping('.kiro/specs/feature/tasks.md#1.1', largeId, 'feature');
      
      const mapping = mapper.getMappingByCirvoyId(largeId);
      expect(mapping).not.toBeNull();
      expect(mapping!.cirvoyId).toBe(largeId);
    });

    it('should handle special characters in spec_id', () => {
      const specialSpecId = 'feature-with-special_chars.123';
      mapper.createMapping('.kiro/specs/feature/tasks.md#1.1', 100, specialSpecId);
      
      const mappings = mapper.getMappingsBySpec(specialSpecId);
      expect(mappings).toHaveLength(1);
      expect(mappings[0].specId).toBe(specialSpecId);
    });

    it('should handle concurrent operations correctly', () => {
      // Create multiple mappings in quick succession
      const operations = [];
      for (let i = 0; i < 100; i++) {
        operations.push(() => {
          mapper.createMapping(
            `.kiro/specs/concurrent/tasks.md#${i}`,
            1000 + i,
            'concurrent'
          );
        });
      }
      
      // Execute all operations
      operations.forEach(op => op());
      
      // Verify all mappings were created
      const mappings = mapper.getMappingsBySpec('concurrent');
      expect(mappings).toHaveLength(100);
    });
  });

  describe('Task Data Transformation', () => {
    describe('toKiroTask', () => {
      beforeEach(() => {
        mapper.createMapping('.kiro/specs/my-feature/tasks.md#1.1', 123, 'my-feature');
      });

      it('should convert Cirvoy task to Kiro task format', () => {
        const cirvoyTask = {
          id: 123,
          title: 'Implement authentication',
          status: 'in-progress',
          project_id: 1,
          updated_at: '2024-01-01T00:00:00Z',
        };

        const kiroTask = mapper.toKiroTask(cirvoyTask);

        expect(kiroTask.path).toBe('.kiro/specs/my-feature/tasks.md#1.1');
        expect(kiroTask.taskId).toBe('1.1');
        expect(kiroTask.title).toBe('Implement authentication');
        expect(kiroTask.status).toBe('in_progress');
        expect(kiroTask.specPath).toBe('my-feature');
      });

      it('should convert all Cirvoy status values correctly', () => {
        const statusTests = [
          { cirvoy: 'not-started', kiro: 'not_started' },
          { cirvoy: 'queued', kiro: 'queued' },
          { cirvoy: 'in-progress', kiro: 'in_progress' },
          { cirvoy: 'completed', kiro: 'completed' },
        ];

        statusTests.forEach(({ cirvoy, kiro }) => {
          const cirvoyTask = {
            id: 123,
            title: 'Test task',
            status: cirvoy,
            project_id: 1,
            updated_at: '2024-01-01T00:00:00Z',
          };

          const kiroTask = mapper.toKiroTask(cirvoyTask);
          expect(kiroTask.status).toBe(kiro);
        });
      });

      it('should preserve Unicode characters in title', () => {
        const cirvoyTask = {
          id: 123,
          title: 'تنفيذ المصادقة 🔐 with émojis',
          status: 'in-progress',
          project_id: 1,
          updated_at: '2024-01-01T00:00:00Z',
        };

        const kiroTask = mapper.toKiroTask(cirvoyTask);
        expect(kiroTask.title).toBe('تنفيذ المصادقة 🔐 with émojis');
      });

      it('should preserve metadata', () => {
        const cirvoyTask = {
          id: 123,
          title: 'Test task',
          status: 'in-progress',
          project_id: 1,
          metadata: { priority: 'high', tags: ['backend', 'security'] },
          updated_at: '2024-01-01T00:00:00Z',
        };

        const kiroTask = mapper.toKiroTask(cirvoyTask);
        expect(kiroTask.metadata).toEqual({ priority: 'high', tags: ['backend', 'security'] });
      });

      it('should throw error when no mapping exists for Cirvoy ID', () => {
        const cirvoyTask = {
          id: 999, // Non-existent ID
          title: 'Test task',
          status: 'in-progress',
          project_id: 1,
          updated_at: '2024-01-01T00:00:00Z',
        };

        expect(() => mapper.toKiroTask(cirvoyTask)).toThrow('No mapping found for Cirvoy task ID: 999');
      });

      it('should throw error for unknown Cirvoy status', () => {
        const cirvoyTask = {
          id: 123,
          title: 'Test task',
          status: 'unknown-status',
          project_id: 1,
          updated_at: '2024-01-01T00:00:00Z',
        };

        expect(() => mapper.toKiroTask(cirvoyTask)).toThrow('Unknown Cirvoy status: unknown-status');
      });

      it('should handle task IDs with multiple levels', () => {
        mapper.createMapping('.kiro/specs/feature/tasks.md#2.3.1', 456, 'feature');

        const cirvoyTask = {
          id: 456,
          title: 'Nested task',
          status: 'completed',
          project_id: 1,
          updated_at: '2024-01-01T00:00:00Z',
        };

        const kiroTask = mapper.toKiroTask(cirvoyTask);
        expect(kiroTask.taskId).toBe('2.3.1');
      });
    });

    describe('toCirvoyTask', () => {
      beforeEach(() => {
        mapper.createMapping('.kiro/specs/my-feature/tasks.md#1.1', 123, 'my-feature');
      });

      it('should convert Kiro task to Cirvoy task format', () => {
        const kiroTask = {
          path: '.kiro/specs/my-feature/tasks.md#1.1',
          taskId: '1.1',
          title: 'Implement authentication',
          status: 'in_progress' as const,
          specPath: 'my-feature',
        };

        const cirvoyTask = mapper.toCirvoyTask(kiroTask, 1);

        expect(cirvoyTask.id).toBe(123);
        expect(cirvoyTask.title).toBe('Implement authentication');
        expect(cirvoyTask.status).toBe('in-progress');
        expect(cirvoyTask.project_id).toBe(1);
        expect(cirvoyTask.updated_at).toBeDefined();
      });

      it('should convert all Kiro status values correctly', () => {
        const statusTests = [
          { kiro: 'not_started' as const, cirvoy: 'not-started' },
          { kiro: 'queued' as const, cirvoy: 'queued' },
          { kiro: 'in_progress' as const, cirvoy: 'in-progress' },
          { kiro: 'completed' as const, cirvoy: 'completed' },
        ];

        statusTests.forEach(({ kiro, cirvoy }) => {
          const kiroTask = {
            path: '.kiro/specs/my-feature/tasks.md#1.1',
            taskId: '1.1',
            title: 'Test task',
            status: kiro,
            specPath: 'my-feature',
          };

          const cirvoyTask = mapper.toCirvoyTask(kiroTask, 1);
          expect(cirvoyTask.status).toBe(cirvoy);
        });
      });

      it('should preserve Unicode characters in title', () => {
        const kiroTask = {
          path: '.kiro/specs/my-feature/tasks.md#1.1',
          taskId: '1.1',
          title: 'تنفيذ المصادقة 🔐 with émojis',
          status: 'in_progress' as const,
          specPath: 'my-feature',
        };

        const cirvoyTask = mapper.toCirvoyTask(kiroTask, 1);
        expect(cirvoyTask.title).toBe('تنفيذ المصادقة 🔐 with émojis');
      });

      it('should preserve metadata', () => {
        const kiroTask = {
          path: '.kiro/specs/my-feature/tasks.md#1.1',
          taskId: '1.1',
          title: 'Test task',
          status: 'in_progress' as const,
          specPath: 'my-feature',
          metadata: { priority: 'high', tags: ['backend', 'security'] },
        };

        const cirvoyTask = mapper.toCirvoyTask(kiroTask, 1);
        expect(cirvoyTask.metadata).toEqual({ priority: 'high', tags: ['backend', 'security'] });
      });

      it('should extract description from metadata', () => {
        const kiroTask = {
          path: '.kiro/specs/my-feature/tasks.md#1.1',
          taskId: '1.1',
          title: 'Test task',
          status: 'in_progress' as const,
          specPath: 'my-feature',
          metadata: { description: 'This is a detailed description' },
        };

        const cirvoyTask = mapper.toCirvoyTask(kiroTask, 1);
        expect(cirvoyTask.description).toBe('This is a detailed description');
      });

      it('should throw error when no mapping exists for Kiro path', () => {
        const kiroTask = {
          path: '.kiro/specs/non-existent/tasks.md#1.1',
          taskId: '1.1',
          title: 'Test task',
          status: 'in_progress' as const,
          specPath: 'non-existent',
        };

        expect(() => mapper.toCirvoyTask(kiroTask, 1)).toThrow('No mapping found for Kiro task path');
      });

      it('should use provided project_id', () => {
        const kiroTask = {
          path: '.kiro/specs/my-feature/tasks.md#1.1',
          taskId: '1.1',
          title: 'Test task',
          status: 'in_progress' as const,
          specPath: 'my-feature',
        };

        const cirvoyTask = mapper.toCirvoyTask(kiroTask, 42);
        expect(cirvoyTask.project_id).toBe(42);
      });

      it('should generate valid ISO 8601 timestamp', () => {
        const kiroTask = {
          path: '.kiro/specs/my-feature/tasks.md#1.1',
          taskId: '1.1',
          title: 'Test task',
          status: 'in_progress' as const,
          specPath: 'my-feature',
        };

        const cirvoyTask = mapper.toCirvoyTask(kiroTask, 1);
        
        // Verify it's a valid ISO 8601 timestamp
        const date = new Date(cirvoyTask.updated_at);
        expect(date.toISOString()).toBe(cirvoyTask.updated_at);
      });
    });

    describe('Round-trip transformation', () => {
      beforeEach(() => {
        mapper.createMapping('.kiro/specs/my-feature/tasks.md#1.1', 123, 'my-feature');
      });

      it('should preserve data through Kiro -> Cirvoy -> Kiro transformation', () => {
        const originalKiroTask = {
          path: '.kiro/specs/my-feature/tasks.md#1.1',
          taskId: '1.1',
          title: 'Implement authentication',
          status: 'in_progress' as const,
          specPath: 'my-feature',
          metadata: { priority: 'high' },
        };

        // Convert to Cirvoy and back
        const cirvoyTask = mapper.toCirvoyTask(originalKiroTask, 1);
        const roundTrippedKiroTask = mapper.toKiroTask(cirvoyTask);

        // Verify all fields match
        expect(roundTrippedKiroTask.path).toBe(originalKiroTask.path);
        expect(roundTrippedKiroTask.taskId).toBe(originalKiroTask.taskId);
        expect(roundTrippedKiroTask.title).toBe(originalKiroTask.title);
        expect(roundTrippedKiroTask.status).toBe(originalKiroTask.status);
        expect(roundTrippedKiroTask.specPath).toBe(originalKiroTask.specPath);
        expect(roundTrippedKiroTask.metadata).toEqual(originalKiroTask.metadata);
      });

      it('should preserve Unicode through round-trip transformation', () => {
        const originalKiroTask = {
          path: '.kiro/specs/my-feature/tasks.md#1.1',
          taskId: '1.1',
          title: 'تنفيذ المصادقة 🔐 émojis 中文',
          status: 'completed' as const,
          specPath: 'my-feature',
        };

        const cirvoyTask = mapper.toCirvoyTask(originalKiroTask, 1);
        const roundTrippedKiroTask = mapper.toKiroTask(cirvoyTask);

        expect(roundTrippedKiroTask.title).toBe(originalKiroTask.title);
      });

      it('should preserve all status values through round-trip', () => {
        const statuses: Array<'not_started' | 'queued' | 'in_progress' | 'completed'> = [
          'not_started',
          'queued',
          'in_progress',
          'completed',
        ];

        statuses.forEach(status => {
          const kiroTask = {
            path: '.kiro/specs/my-feature/tasks.md#1.1',
            taskId: '1.1',
            title: 'Test task',
            status,
            specPath: 'my-feature',
          };

          const cirvoyTask = mapper.toCirvoyTask(kiroTask, 1);
          const roundTrippedKiroTask = mapper.toKiroTask(cirvoyTask);

          expect(roundTrippedKiroTask.status).toBe(status);
        });
      });
    });
  });
});

describe('Task Validation', () => {
  let tempDir: string;
  let dbPath: string;
  let db: Database.Database;
  let mapper: TaskMapper;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'cirvoy-test-'));
    dbPath = join(tempDir, 'test.db');
    db = initializeDatabase({ dbPath });
    mapper = createTaskMapper(db);
  });

  afterEach(() => {
    if (db) {
      closeDatabase(db);
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('validateKiroTask', () => {
    it('should validate a valid Kiro task', () => {
      const validTask = {
        path: '.kiro/specs/my-feature/tasks.md#1.1',
        taskId: '1.1',
        title: 'Implement authentication',
        status: 'in_progress',
        specPath: 'my-feature',
      };

      const result = mapper.validateKiroTask(validTask);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate Kiro task with optional metadata', () => {
      const validTask = {
        path: '.kiro/specs/my-feature/tasks.md#1.1',
        taskId: '1.1',
        title: 'Implement authentication',
        status: 'completed',
        specPath: 'my-feature',
        metadata: { priority: 'high', tags: ['backend'] },
      };

      const result = mapper.validateKiroTask(validTask);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject task with missing required field (path)', () => {
      const invalidTask = {
        taskId: '1.1',
        title: 'Test task',
        status: 'in_progress',
        specPath: 'my-feature',
      };

      const result = mapper.validateKiroTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('path'))).toBe(true);
    });

    it('should reject task with missing required field (taskId)', () => {
      const invalidTask = {
        path: '.kiro/specs/my-feature/tasks.md#1.1',
        title: 'Test task',
        status: 'in_progress',
        specPath: 'my-feature',
      };

      const result = mapper.validateKiroTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('taskId'))).toBe(true);
    });

    it('should reject task with missing required field (title)', () => {
      const invalidTask = {
        path: '.kiro/specs/my-feature/tasks.md#1.1',
        taskId: '1.1',
        status: 'in_progress',
        specPath: 'my-feature',
      };

      const result = mapper.validateKiroTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('title'))).toBe(true);
    });

    it('should reject task with missing required field (status)', () => {
      const invalidTask = {
        path: '.kiro/specs/my-feature/tasks.md#1.1',
        taskId: '1.1',
        title: 'Test task',
        specPath: 'my-feature',
      };

      const result = mapper.validateKiroTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('status'))).toBe(true);
    });

    it('should reject task with missing required field (specPath)', () => {
      const invalidTask = {
        path: '.kiro/specs/my-feature/tasks.md#1.1',
        taskId: '1.1',
        title: 'Test task',
        status: 'in_progress',
      };

      const result = mapper.validateKiroTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('specPath'))).toBe(true);
    });

    it('should reject task with invalid status value', () => {
      const invalidTask = {
        path: '.kiro/specs/my-feature/tasks.md#1.1',
        taskId: '1.1',
        title: 'Test task',
        status: 'invalid_status',
        specPath: 'my-feature',
      };

      const result = mapper.validateKiroTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'status')).toBe(true);
      expect(result.errors.some(e => e.message.includes('not_started, queued, in_progress, completed'))).toBe(true);
    });

    it('should reject task with empty string for required field', () => {
      const invalidTask = {
        path: '',
        taskId: '1.1',
        title: 'Test task',
        status: 'in_progress',
        specPath: 'my-feature',
      };

      const result = mapper.validateKiroTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'path')).toBe(true);
      expect(result.errors.some(e => e.message.includes('at least'))).toBe(true);
    });

    it('should reject task with wrong type for field', () => {
      const invalidTask = {
        path: '.kiro/specs/my-feature/tasks.md#1.1',
        taskId: 123, // Should be string
        title: 'Test task',
        status: 'in_progress',
        specPath: 'my-feature',
      };

      const result = mapper.validateKiroTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'taskId')).toBe(true);
      expect(result.errors.some(e => e.message.includes('type'))).toBe(true);
    });

    it('should reject task with invalid taskId pattern', () => {
      const invalidTask = {
        path: '.kiro/specs/my-feature/tasks.md#1.1',
        taskId: 'invalid-id',
        title: 'Test task',
        status: 'in_progress',
        specPath: 'my-feature',
      };

      const result = mapper.validateKiroTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'taskId')).toBe(true);
      expect(result.errors.some(e => e.message.includes('pattern'))).toBe(true);
    });

    it('should reject task with additional unknown properties', () => {
      const invalidTask = {
        path: '.kiro/specs/my-feature/tasks.md#1.1',
        taskId: '1.1',
        title: 'Test task',
        status: 'in_progress',
        specPath: 'my-feature',
        unknownField: 'should not be here',
      };

      const result = mapper.validateKiroTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Unknown field'))).toBe(true);
    });

    it('should provide detailed error messages for multiple validation errors', () => {
      const invalidTask = {
        path: '',
        taskId: '',
        title: '',
        status: 'wrong',
        specPath: '',
      };

      const result = mapper.validateKiroTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      // Should have errors for multiple fields
      expect(result.errors.some(e => e.field === 'path')).toBe(true);
      expect(result.errors.some(e => e.field === 'status')).toBe(true);
    });

    it('should accept valid taskId patterns', () => {
      const validPatterns = ['1', '1.1', '1.2.3', '10.20.30'];

      validPatterns.forEach(taskId => {
        const task = {
          path: '.kiro/specs/my-feature/tasks.md#' + taskId,
          taskId,
          title: 'Test task',
          status: 'in_progress',
          specPath: 'my-feature',
        };

        const result = mapper.validateKiroTask(task);
        expect(result.valid).toBe(true);
      });
    });

    it('should preserve Unicode in validation', () => {
      const validTask = {
        path: '.kiro/specs/مشروع/tasks.md#1.1',
        taskId: '1.1',
        title: 'تنفيذ المصادقة 🔐',
        status: 'in_progress',
        specPath: 'مشروع',
      };

      const result = mapper.validateKiroTask(validTask);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateCirvoyTask', () => {
    it('should validate a valid Cirvoy task', () => {
      const validTask = {
        id: 123,
        title: 'Implement authentication',
        status: 'in-progress',
        project_id: 1,
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = mapper.validateCirvoyTask(validTask);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate Cirvoy task with optional fields', () => {
      const validTask = {
        id: 123,
        title: 'Implement authentication',
        status: 'in-progress',
        project_id: 1,
        description: 'This is a detailed description',
        metadata: { priority: 'high' },
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = mapper.validateCirvoyTask(validTask);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject task with missing required field (id)', () => {
      const invalidTask = {
        title: 'Test task',
        status: 'in-progress',
        project_id: 1,
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = mapper.validateCirvoyTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('id'))).toBe(true);
    });

    it('should reject task with missing required field (title)', () => {
      const invalidTask = {
        id: 123,
        status: 'in-progress',
        project_id: 1,
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = mapper.validateCirvoyTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('title'))).toBe(true);
    });

    it('should reject task with missing required field (status)', () => {
      const invalidTask = {
        id: 123,
        title: 'Test task',
        project_id: 1,
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = mapper.validateCirvoyTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('status'))).toBe(true);
    });

    it('should reject task with missing required field (project_id)', () => {
      const invalidTask = {
        id: 123,
        title: 'Test task',
        status: 'in-progress',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = mapper.validateCirvoyTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('project_id'))).toBe(true);
    });

    it('should reject task with missing required field (updated_at)', () => {
      const invalidTask = {
        id: 123,
        title: 'Test task',
        status: 'in-progress',
        project_id: 1,
      };

      const result = mapper.validateCirvoyTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('updated_at'))).toBe(true);
    });

    it('should reject task with invalid id (less than 1)', () => {
      const invalidTask = {
        id: 0,
        title: 'Test task',
        status: 'in-progress',
        project_id: 1,
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = mapper.validateCirvoyTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'id')).toBe(true);
      expect(result.errors.some(e => e.message.includes('at least'))).toBe(true);
    });

    it('should reject task with invalid project_id (less than 1)', () => {
      const invalidTask = {
        id: 123,
        title: 'Test task',
        status: 'in-progress',
        project_id: -1,
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = mapper.validateCirvoyTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'project_id')).toBe(true);
    });

    it('should reject task with empty title', () => {
      const invalidTask = {
        id: 123,
        title: '',
        status: 'in-progress',
        project_id: 1,
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = mapper.validateCirvoyTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'title')).toBe(true);
    });

    it('should reject task with empty status', () => {
      const invalidTask = {
        id: 123,
        title: 'Test task',
        status: '',
        project_id: 1,
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = mapper.validateCirvoyTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'status')).toBe(true);
    });

    it('should reject task with invalid date-time format', () => {
      const invalidTask = {
        id: 123,
        title: 'Test task',
        status: 'in-progress',
        project_id: 1,
        updated_at: 'not-a-date',
      };

      const result = mapper.validateCirvoyTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'updated_at')).toBe(true);
      expect(result.errors.some(e => e.message.includes('date-time'))).toBe(true);
    });

    it('should reject task with wrong type for field', () => {
      const invalidTask = {
        id: '123', // Should be number
        title: 'Test task',
        status: 'in-progress',
        project_id: 1,
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = mapper.validateCirvoyTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'id')).toBe(true);
      expect(result.errors.some(e => e.message.includes('type'))).toBe(true);
    });

    it('should reject task with additional unknown properties', () => {
      const invalidTask = {
        id: 123,
        title: 'Test task',
        status: 'in-progress',
        project_id: 1,
        updated_at: '2024-01-01T00:00:00Z',
        unknownField: 'should not be here',
      };

      const result = mapper.validateCirvoyTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Unknown field'))).toBe(true);
    });

    it('should provide detailed error messages for multiple validation errors', () => {
      const invalidTask = {
        id: 0,
        title: '',
        status: '',
        project_id: 0,
        updated_at: 'invalid',
      };

      const result = mapper.validateCirvoyTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept various valid ISO 8601 date formats', () => {
      const validDates = [
        '2024-01-01T00:00:00Z',
        '2024-01-01T12:30:45.123Z',
        '2024-01-01T00:00:00+00:00',
        '2024-01-01T00:00:00-05:00',
      ];

      validDates.forEach(date => {
        const task = {
          id: 123,
          title: 'Test task',
          status: 'in-progress',
          project_id: 1,
          updated_at: date,
        };

        const result = mapper.validateCirvoyTask(task);
        expect(result.valid).toBe(true);
      });
    });

    it('should preserve Unicode in validation', () => {
      const validTask = {
        id: 123,
        title: 'تنفيذ المصادقة 🔐',
        status: 'in-progress',
        project_id: 1,
        description: 'وصف تفصيلي',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = mapper.validateCirvoyTask(validTask);

      expect(result.valid).toBe(true);
    });
  });

  describe('Validation error details', () => {
    it('should include field name in validation errors', () => {
      const invalidTask = {
        path: '',
        taskId: '1.1',
        title: 'Test',
        status: 'in_progress',
        specPath: 'test',
      };

      const result = mapper.validateKiroTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBeDefined();
      expect(typeof result.errors[0].field).toBe('string');
    });

    it('should include error message in validation errors', () => {
      const invalidTask = {
        path: '',
        taskId: '1.1',
        title: 'Test',
        status: 'in_progress',
        specPath: 'test',
      };

      const result = mapper.validateKiroTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBeDefined();
      expect(typeof result.errors[0].message).toBe('string');
      expect(result.errors[0].message.length).toBeGreaterThan(0);
    });

    it('should include invalid value in validation errors', () => {
      const invalidTask = {
        path: '',
        taskId: '1.1',
        title: 'Test',
        status: 'in_progress',
        specPath: 'test',
      };

      const result = mapper.validateKiroTask(invalidTask);

      expect(result.valid).toBe(false);
      expect(result.errors[0].value).toBeDefined();
    });
  });
});

