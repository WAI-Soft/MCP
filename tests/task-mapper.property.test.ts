/**
 * Property-Based Tests for Task Mapper
 * 
 * These tests verify universal properties that should hold across all inputs
 * using fast-check library with minimum 100 iterations per test.
 * 
 * Feature: cirvoy-kiro-mcp-integration
 * Requirements: 3.2, 11.3, 11.4, 11.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { initializeDatabase, closeDatabase } from '../src/database/schema';
import { createTaskMapper, TaskMapper } from '../src/task-mapper';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { KiroTask, KiroTaskStatus } from '../src/types/task';

// Test configuration: minimum 100 iterations per property test
const testConfig = { numRuns: 100 };

/**
 * Arbitrary generator for valid Kiro task paths
 */
const arbitraryKiroPath = () => fc.tuple(
  fc.stringMatching(/^[a-zA-Z0-9_-]+$/), // spec name
  fc.stringMatching(/^[0-9]+(\.[0-9]+)*$/) // task ID
).map(([specName, taskId]) => `.kiro/specs/${specName}/tasks.md#${taskId}`);

/**
 * Arbitrary generator for valid Cirvoy task IDs
 */
const arbitraryCirvoyId = () => fc.integer({ min: 1, max: 1000000 });

/**
 * Arbitrary generator for valid spec IDs
 */
const arbitrarySpecId = () => fc.stringMatching(/^[a-zA-Z0-9_-]+$/);

/**
 * Arbitrary generator for Kiro task status values
 */
const arbitraryKiroStatus = (): fc.Arbitrary<KiroTaskStatus> => 
  fc.constantFrom('not_started', 'queued', 'in_progress', 'completed');

/**
 * Arbitrary generator for Cirvoy task status values
 */
const arbitraryCirvoyStatus = () => 
  fc.constantFrom('not-started', 'queued', 'in-progress', 'completed');

/**
 * Arbitrary generator for Unicode strings (including emojis, RTL text, etc.)
 */
const arbitraryUnicodeString = () => fc.oneof(
  fc.unicodeString({ minLength: 1, maxLength: 100 }),
  fc.constant('تنفيذ المصادقة'), // Arabic
  fc.constant('实现身份验证'), // Chinese
  fc.constant('Реализация аутентификации'), // Russian
  fc.constant('🔐 Implement authentication 🚀'), // Emojis
  fc.constant('مشروع عربي with English'), // Mixed RTL/LTR
  fc.constant('Café résumé naïve'), // Accented characters
);

/**
 * Arbitrary generator for valid KiroTask objects
 */
const arbitraryKiroTask = (): fc.Arbitrary<KiroTask> => {
  return fc.stringMatching(/^[0-9]+(\.[0-9]+)*$/).chain(taskId => {
    return fc.record({
      path: fc.constant(`.kiro/specs/test-spec/tasks.md#${taskId}`),
      taskId: fc.constant(taskId),
      title: arbitraryUnicodeString(),
      status: arbitraryKiroStatus(),
      specPath: fc.constant('test-spec'),
      metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
    });
  });
};

/**
 * Arbitrary generator for valid CirvoyTask objects
 */
const arbitraryCirvoyTask = () => fc.record({
  id: arbitraryCirvoyId(),
  title: arbitraryUnicodeString(),
  status: arbitraryCirvoyStatus(),
  project_id: fc.integer({ min: 1, max: 1000 }),
  description: fc.option(arbitraryUnicodeString(), { nil: undefined }),
  metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
  updated_at: fc.date().map(d => d.toISOString())
});

describe('Task Mapper Property-Based Tests', () => {
  let tempDir: string;
  let dbPath: string;
  let db: Database.Database;
  let mapper: TaskMapper;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'cirvoy-pbt-'));
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

  describe('Property 10: Task Mapping Round-Trip', () => {
    /**
     * **Validates: Requirements 3.2**
     * 
     * For any task mapping created between Kiro path and Cirvoy ID,
     * storing the mapping and then retrieving it should return an equivalent mapping.
     */
    it('should preserve mapping data through create and retrieve round-trip', () => {
      fc.assert(
        fc.property(
          arbitraryKiroPath(),
          arbitraryCirvoyId(),
          arbitrarySpecId(),
          fc.constantFrom('kiro-to-cirvoy', 'cirvoy-to-kiro'),
          (kiroPath, cirvoyId, specId, direction) => {
            // Create a fresh database for each iteration to avoid conflicts
            const iterTempDir = mkdtempSync(join(tmpdir(), 'cirvoy-pbt-iter-'));
            const iterDbPath = join(iterTempDir, 'test.db');
            const iterDb = initializeDatabase({ dbPath: iterDbPath });
            const iterMapper = createTaskMapper(iterDb);

            try {
              // Create mapping
              iterMapper.createMapping(kiroPath, cirvoyId, specId, direction);

              // Retrieve by Kiro path
              const retrievedByPath = iterMapper.getMapping(kiroPath);

              // Verify mapping exists and all fields match
              expect(retrievedByPath).not.toBeNull();
              expect(retrievedByPath!.kiroPath).toBe(kiroPath);
              expect(retrievedByPath!.cirvoyId).toBe(cirvoyId);
              expect(retrievedByPath!.specId).toBe(specId);
              expect(retrievedByPath!.lastSyncDirection).toBe(direction);
              expect(retrievedByPath!.version).toBe(1);
              expect(retrievedByPath!.lastSyncedAt).toBeInstanceOf(Date);

              // Retrieve by Cirvoy ID
              const retrievedById = iterMapper.getMappingByCirvoyId(cirvoyId);

              // Verify both retrieval methods return the same data
              expect(retrievedById).not.toBeNull();
              expect(retrievedById!.kiroPath).toBe(kiroPath);
              expect(retrievedById!.cirvoyId).toBe(cirvoyId);
              expect(retrievedById!.specId).toBe(specId);
              expect(retrievedById!.lastSyncDirection).toBe(direction);
            } finally {
              closeDatabase(iterDb);
              rmSync(iterTempDir, { recursive: true, force: true });
            }
          }
        ),
        testConfig
      );
    });
  });

  describe('Property 32: Status Conversion Round-Trip', () => {
    /**
     * **Validates: Requirements 11.3**
     * 
     * For any task status value, converting from Kiro format to Cirvoy format
     * and back to Kiro format should produce the original status value.
     */
    it('should preserve status through Kiro -> Cirvoy -> Kiro conversion', () => {
      fc.assert(
        fc.property(
          arbitraryKiroStatus(),
          arbitraryCirvoyId(),
          (kiroStatus, cirvoyId) => {
            // Create a fresh database for each iteration to avoid conflicts
            const iterTempDir = mkdtempSync(join(tmpdir(), 'cirvoy-pbt-status-'));
            const iterDbPath = join(iterTempDir, 'test.db');
            const iterDb = initializeDatabase({ dbPath: iterDbPath });
            const iterMapper = createTaskMapper(iterDb);

            try {
              // Create a mapping for the conversion
              const kiroPath = '.kiro/specs/test-feature/tasks.md#1.1';
              iterMapper.createMapping(kiroPath, cirvoyId, 'test-feature');

              // Create a Kiro task with the status
              const kiroTask: KiroTask = {
                path: kiroPath,
                taskId: '1.1',
                title: 'Test task',
                status: kiroStatus,
                specPath: 'test-feature',
              };

              // Convert to Cirvoy format
              const cirvoyTask = iterMapper.toCirvoyTask(kiroTask, 1);

              // Convert back to Kiro format
              const roundTrippedKiroTask = iterMapper.toKiroTask(cirvoyTask);

              // Verify status is preserved
              expect(roundTrippedKiroTask.status).toBe(kiroStatus);
            } finally {
              closeDatabase(iterDb);
              rmSync(iterTempDir, { recursive: true, force: true });
            }
          }
        ),
        testConfig
      );
    });

    it('should preserve status through Cirvoy -> Kiro -> Cirvoy conversion', () => {
      fc.assert(
        fc.property(
          arbitraryCirvoyStatus(),
          arbitraryCirvoyId(),
          (cirvoyStatus, cirvoyId) => {
            // Create a fresh database for each iteration to avoid conflicts
            const iterTempDir = mkdtempSync(join(tmpdir(), 'cirvoy-pbt-status2-'));
            const iterDbPath = join(iterTempDir, 'test.db');
            const iterDb = initializeDatabase({ dbPath: iterDbPath });
            const iterMapper = createTaskMapper(iterDb);

            try {
              // Create a mapping for the conversion
              const kiroPath = '.kiro/specs/test-feature/tasks.md#1.1';
              iterMapper.createMapping(kiroPath, cirvoyId, 'test-feature');

              // Create a Cirvoy task with the status
              const cirvoyTask = {
                id: cirvoyId,
                title: 'Test task',
                status: cirvoyStatus,
                project_id: 1,
                updated_at: new Date().toISOString(),
              };

              // Convert to Kiro format
              const kiroTask = iterMapper.toKiroTask(cirvoyTask);

              // Convert back to Cirvoy format
              const roundTrippedCirvoyTask = iterMapper.toCirvoyTask(kiroTask, 1);

              // Verify status is preserved
              expect(roundTrippedCirvoyTask.status).toBe(cirvoyStatus);
            } finally {
              closeDatabase(iterDb);
              rmSync(iterTempDir, { recursive: true, force: true });
            }
          }
        ),
        testConfig
      );
    });
  });

  describe('Property 33: Unicode Preservation', () => {
    /**
     * **Validates: Requirements 11.4**
     * 
     * For any task with Unicode characters in title or description,
     * the characters should be preserved exactly after transformation
     * between Kiro and Cirvoy formats.
     */
    it('should preserve Unicode characters in title through Kiro -> Cirvoy -> Kiro transformation', () => {
      fc.assert(
        fc.property(
          arbitraryUnicodeString(),
          arbitraryCirvoyId(),
          (unicodeTitle, cirvoyId) => {
            // Create a fresh database for each iteration to avoid conflicts
            const iterTempDir = mkdtempSync(join(tmpdir(), 'cirvoy-pbt-unicode-title-'));
            const iterDbPath = join(iterTempDir, 'test.db');
            const iterDb = initializeDatabase({ dbPath: iterDbPath });
            const iterMapper = createTaskMapper(iterDb);

            try {
              // Create a mapping for the conversion
              const kiroPath = '.kiro/specs/test-feature/tasks.md#1.1';
              iterMapper.createMapping(kiroPath, cirvoyId, 'test-feature');

              // Create a Kiro task with Unicode title
              const kiroTask: KiroTask = {
                path: kiroPath,
                taskId: '1.1',
                title: unicodeTitle,
                status: 'in_progress',
                specPath: 'test-feature',
              };

              // Convert to Cirvoy and back
              const cirvoyTask = iterMapper.toCirvoyTask(kiroTask, 1);
              const roundTrippedKiroTask = iterMapper.toKiroTask(cirvoyTask);

              // Verify Unicode title is preserved exactly
              expect(roundTrippedKiroTask.title).toBe(unicodeTitle);
            } finally {
              closeDatabase(iterDb);
              rmSync(iterTempDir, { recursive: true, force: true });
            }
          }
        ),
        testConfig
      );
    });

    it('should preserve Unicode characters in description through transformations', () => {
      fc.assert(
        fc.property(
          arbitraryUnicodeString(),
          arbitraryCirvoyId(),
          (unicodeDescription, cirvoyId) => {
            // Create a fresh database for each iteration to avoid conflicts
            const iterTempDir = mkdtempSync(join(tmpdir(), 'cirvoy-pbt-unicode-desc-'));
            const iterDbPath = join(iterTempDir, 'test.db');
            const iterDb = initializeDatabase({ dbPath: iterDbPath });
            const iterMapper = createTaskMapper(iterDb);

            try {
              // Create a mapping for the conversion
              const kiroPath = '.kiro/specs/test-feature/tasks.md#1.1';
              iterMapper.createMapping(kiroPath, cirvoyId, 'test-feature');

              // Create a Kiro task with Unicode description in metadata
              const kiroTask: KiroTask = {
                path: kiroPath,
                taskId: '1.1',
                title: 'Test task',
                status: 'in_progress',
                specPath: 'test-feature',
                metadata: { description: unicodeDescription },
              };

              // Convert to Cirvoy and back
              const cirvoyTask = iterMapper.toCirvoyTask(kiroTask, 1);
              const roundTrippedKiroTask = iterMapper.toKiroTask(cirvoyTask);

              // Verify Unicode description is preserved exactly
              expect(roundTrippedKiroTask.metadata?.description).toBe(unicodeDescription);
            } finally {
              closeDatabase(iterDb);
              rmSync(iterTempDir, { recursive: true, force: true });
            }
          }
        ),
        testConfig
      );
    });

    it('should preserve Unicode in Kiro paths', () => {
      fc.assert(
        fc.property(
          arbitraryUnicodeString(),
          arbitraryCirvoyId(),
          (unicodeSpecName, cirvoyId) => {
            // Create a fresh database for each iteration to avoid conflicts
            const iterTempDir = mkdtempSync(join(tmpdir(), 'cirvoy-pbt-unicode-'));
            const iterDbPath = join(iterTempDir, 'test.db');
            const iterDb = initializeDatabase({ dbPath: iterDbPath });
            const iterMapper = createTaskMapper(iterDb);

            try {
              // Create a path with Unicode characters
              const unicodePath = `.kiro/specs/${unicodeSpecName}/tasks.md#1.1`;

              // Create mapping with Unicode path
              iterMapper.createMapping(unicodePath, cirvoyId, unicodeSpecName);

              // Retrieve mapping
              const retrieved = iterMapper.getMapping(unicodePath);

              // Verify Unicode path is preserved
              expect(retrieved).not.toBeNull();
              expect(retrieved!.kiroPath).toBe(unicodePath);
              expect(retrieved!.specId).toBe(unicodeSpecName);
            } finally {
              closeDatabase(iterDb);
              rmSync(iterTempDir, { recursive: true, force: true });
            }
          }
        ),
        testConfig
      );
    });
  });

  describe('Property 34: Task Transformation Round-Trip', () => {
    /**
     * **Validates: Requirements 11.5**
     * 
     * For any valid task object, transforming from Kiro format to Cirvoy format
     * and back to Kiro format should produce an equivalent task object with all
     * fields preserved.
     */
    it('should preserve all task fields through Kiro -> Cirvoy -> Kiro transformation', () => {
      fc.assert(
        fc.property(
          arbitraryKiroTask(),
          fc.integer({ min: 1, max: 1000 }),
          (kiroTask, projectId) => {
            // Create a fresh database for each iteration to avoid conflicts
            const iterTempDir = mkdtempSync(join(tmpdir(), 'cirvoy-pbt-transform-'));
            const iterDbPath = join(iterTempDir, 'test.db');
            const iterDb = initializeDatabase({ dbPath: iterDbPath });
            const iterMapper = createTaskMapper(iterDb);

            try {
              // Extract cirvoy ID from the task path or generate one
              const cirvoyId = Math.floor(Math.random() * 1000000) + 1;

              // Create mapping for the task
              iterMapper.createMapping(kiroTask.path, cirvoyId, kiroTask.specPath);

              // Convert to Cirvoy format
              const cirvoyTask = iterMapper.toCirvoyTask(kiroTask, projectId);

              // Convert back to Kiro format
              const roundTrippedKiroTask = iterMapper.toKiroTask(cirvoyTask);

              // Verify all fields are preserved
              expect(roundTrippedKiroTask.path).toBe(kiroTask.path);
              expect(roundTrippedKiroTask.taskId).toBe(kiroTask.taskId);
              expect(roundTrippedKiroTask.title).toBe(kiroTask.title);
              expect(roundTrippedKiroTask.status).toBe(kiroTask.status);
              expect(roundTrippedKiroTask.specPath).toBe(kiroTask.specPath);

              // Verify metadata is preserved (deep equality)
              if (kiroTask.metadata) {
                expect(roundTrippedKiroTask.metadata).toEqual(kiroTask.metadata);
              } else {
                expect(roundTrippedKiroTask.metadata).toBeUndefined();
              }
            } finally {
              closeDatabase(iterDb);
              rmSync(iterTempDir, { recursive: true, force: true });
            }
          }
        ),
        testConfig
      );
    });

    it('should preserve all task fields through Cirvoy -> Kiro -> Cirvoy transformation', () => {
      fc.assert(
        fc.property(
          arbitraryCirvoyTask(),
          (cirvoyTask) => {
            // Create a fresh database for each iteration to avoid conflicts
            const iterTempDir = mkdtempSync(join(tmpdir(), 'cirvoy-pbt-transform2-'));
            const iterDbPath = join(iterTempDir, 'test.db');
            const iterDb = initializeDatabase({ dbPath: iterDbPath });
            const iterMapper = createTaskMapper(iterDb);

            try {
              // Create a mapping for the Cirvoy task
              const kiroPath = `.kiro/specs/test-spec-${cirvoyTask.id}/tasks.md#1.1`;
              iterMapper.createMapping(kiroPath, cirvoyTask.id, `test-spec-${cirvoyTask.id}`);

              // Convert to Kiro format
              const kiroTask = iterMapper.toKiroTask(cirvoyTask);

              // Convert back to Cirvoy format
              const roundTrippedCirvoyTask = iterMapper.toCirvoyTask(kiroTask, cirvoyTask.project_id);

              // Verify all fields are preserved
              expect(roundTrippedCirvoyTask.id).toBe(cirvoyTask.id);
              expect(roundTrippedCirvoyTask.title).toBe(cirvoyTask.title);
              expect(roundTrippedCirvoyTask.status).toBe(cirvoyTask.status);
              expect(roundTrippedCirvoyTask.project_id).toBe(cirvoyTask.project_id);

              // Verify metadata is preserved (deep equality)
              if (cirvoyTask.metadata) {
                expect(roundTrippedCirvoyTask.metadata).toEqual(cirvoyTask.metadata);
              }

              // Note: updated_at will be different as it's regenerated, which is expected behavior
              // Description is stored in metadata, so it's covered by metadata check
            } finally {
              closeDatabase(iterDb);
              rmSync(iterTempDir, { recursive: true, force: true });
            }
          }
        ),
        testConfig
      );
    });

    it('should handle tasks with complex nested metadata through round-trip', () => {
      fc.assert(
        fc.property(
          arbitraryKiroPath(),
          arbitraryUnicodeString(),
          arbitraryKiroStatus(),
          fc.dictionary(
            fc.string(),
            fc.oneof(
              fc.string(),
              fc.integer(),
              fc.boolean(),
              fc.array(fc.string()),
              fc.dictionary(fc.string(), fc.string())
            )
          ),
          (kiroPath, title, status, metadata) => {
            // Create a fresh database for each iteration
            const iterTempDir = mkdtempSync(join(tmpdir(), 'cirvoy-pbt-metadata-'));
            const iterDbPath = join(iterTempDir, 'test.db');
            const iterDb = initializeDatabase({ dbPath: iterDbPath });
            const iterMapper = createTaskMapper(iterDb);

            try {
              const cirvoyId = Math.floor(Math.random() * 1000000) + 1;
              const specId = 'test-spec';

              // Create mapping
              iterMapper.createMapping(kiroPath, cirvoyId, specId);

              // Extract task ID from path
              const taskIdMatch = kiroPath.match(/#(.+)$/);
              const taskId = taskIdMatch ? taskIdMatch[1] : '1.1';

              // Create Kiro task with complex metadata
              const kiroTask: KiroTask = {
                path: kiroPath,
                taskId,
                title,
                status,
                specPath: specId,
                metadata,
              };

              // Convert to Cirvoy and back
              const cirvoyTask = iterMapper.toCirvoyTask(kiroTask, 1);
              const roundTrippedKiroTask = iterMapper.toKiroTask(cirvoyTask);

              // Verify metadata is preserved exactly
              expect(roundTrippedKiroTask.metadata).toEqual(metadata);
            } finally {
              closeDatabase(iterDb);
              rmSync(iterTempDir, { recursive: true, force: true });
            }
          }
        ),
        testConfig
      );
    });
  });
});
