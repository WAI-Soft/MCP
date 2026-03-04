/**
 * Task Mapper module
 * 
 * Provides CRUD operations for task mappings between Kiro and Cirvoy systems.
 * Maintains mappings in SQLite database with unique constraints and optimized queries.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import Database from 'better-sqlite3';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { 
  TaskMapping, 
  KiroTask, 
  KiroTaskStatus, 
  CirvoyTask,
  ValidationResult,
  ValidationError,
  kiroTaskSchema,
  cirvoyTaskSchema
} from '../types/task';

/**
 * Task Mapper class for managing task mappings
 * 
 * Provides CRUD operations with:
 * - Unique constraint handling for kiro_path and cirvoy_id
 * - Query performance <100ms (Requirement 3.3)
 * - Support for task relocations (Requirement 3.4)
 */
export class TaskMapper {
  private db: Database.Database;
  private ajv: Ajv;
  
  // Prepared statements for optimal performance
  private insertStmt: Database.Statement;
  private selectByKiroPathStmt: Database.Statement;
  private selectByCirvoyIdStmt: Database.Statement;
  private updatePathStmt: Database.Statement;
  private deleteStmt: Database.Statement;

  constructor(db: Database.Database) {
    this.db = db;
    
    // Initialize AJV validator with formats support
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    
    // Compile schemas for validation
    this.ajv.addSchema(kiroTaskSchema, 'kiroTask');
    this.ajv.addSchema(cirvoyTaskSchema, 'cirvoyTask');
    
    // Prepare statements once for reuse (improves performance)
    this.insertStmt = db.prepare(`
      INSERT INTO task_mappings 
      (kiro_path, cirvoy_id, spec_id, last_synced_at, last_sync_direction, version)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    this.selectByKiroPathStmt = db.prepare(`
      SELECT 
        kiro_path as kiroPath,
        cirvoy_id as cirvoyId,
        spec_id as specId,
        last_synced_at as lastSyncedAt,
        last_sync_direction as lastSyncDirection,
        version
      FROM task_mappings
      WHERE kiro_path = ?
    `);
    
    this.selectByCirvoyIdStmt = db.prepare(`
      SELECT 
        kiro_path as kiroPath,
        cirvoy_id as cirvoyId,
        spec_id as specId,
        last_synced_at as lastSyncedAt,
        last_sync_direction as lastSyncDirection,
        version
      FROM task_mappings
      WHERE cirvoy_id = ?
    `);
    
    this.updatePathStmt = db.prepare(`
      UPDATE task_mappings
      SET kiro_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE kiro_path = ?
    `);
    
    this.deleteStmt = db.prepare(`
      DELETE FROM task_mappings
      WHERE kiro_path = ?
    `);
  }

  /**
   * Create a new task mapping
   * 
   * @param kiroPath - Kiro task path (must be unique)
   * @param cirvoyId - Cirvoy task ID (must be unique)
   * @param specId - Spec ID that this task belongs to
   * @param lastSyncDirection - Direction of the sync operation
   * @throws Error if mapping with same kiroPath or cirvoyId already exists
   * 
   * Requirement 3.1: Generate unique identifier for linking with Cirvoy
   * Requirement 3.2: Store mapping in persistent database
   */
  createMapping(
    kiroPath: string,
    cirvoyId: number,
    specId: string,
    lastSyncDirection: 'kiro-to-cirvoy' | 'cirvoy-to-kiro' = 'kiro-to-cirvoy'
  ): void {
    try {
      this.insertStmt.run(
        kiroPath,
        cirvoyId,
        specId,
        new Date().toISOString(),
        lastSyncDirection,
        1 // Initial version
      );
    } catch (error: any) {
      // Handle unique constraint violations
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message.includes('UNIQUE constraint failed')) {
        // Determine which constraint was violated
        if (error.message.includes('kiro_path')) {
          throw new Error(`Mapping already exists for Kiro path: ${kiroPath}`);
        } else if (error.message.includes('cirvoy_id')) {
          throw new Error(`Mapping already exists for Cirvoy ID: ${cirvoyId}`);
        } else {
          throw new Error(`Unique constraint violation: ${error.message}`);
        }
      }
      throw error;
    }
  }

  /**
   * Get task mapping by Kiro path
   * 
   * @param kiroPath - Kiro task path to look up
   * @returns TaskMapping if found, null otherwise
   * 
   * Requirement 3.3: Return results within 100 milliseconds
   * Uses prepared statement and indexed query for optimal performance
   */
  getMapping(kiroPath: string): TaskMapping | null {
    const row = this.selectByKiroPathStmt.get(kiroPath) as any;
    
    if (!row) {
      return null;
    }
    
    return {
      kiroPath: row.kiroPath,
      cirvoyId: row.cirvoyId,
      specId: row.specId,
      lastSyncedAt: new Date(row.lastSyncedAt),
      lastSyncDirection: row.lastSyncDirection,
      version: row.version,
    };
  }

  /**
   * Get task mapping by Cirvoy ID
   * 
   * @param cirvoyId - Cirvoy task ID to look up
   * @returns TaskMapping if found, null otherwise
   * 
   * Requirement 3.3: Return results within 100 milliseconds
   * Uses prepared statement and indexed query for optimal performance
   */
  getMappingByCirvoyId(cirvoyId: number): TaskMapping | null {
    const row = this.selectByCirvoyIdStmt.get(cirvoyId) as any;
    
    if (!row) {
      return null;
    }
    
    return {
      kiroPath: row.kiroPath,
      cirvoyId: row.cirvoyId,
      specId: row.specId,
      lastSyncedAt: new Date(row.lastSyncedAt),
      lastSyncDirection: row.lastSyncDirection,
      version: row.version,
    };
  }

  /**
   * Update task mapping when task file is relocated
   * 
   * @param oldPath - Current Kiro task path
   * @param newPath - New Kiro task path after relocation
   * @throws Error if oldPath doesn't exist or newPath already exists
   * 
   * Requirement 3.4: Handle task file relocations by updating mappings
   */
  updateMapping(oldPath: string, newPath: string): void {
    // Check if old path exists
    const existing = this.getMapping(oldPath);
    if (!existing) {
      throw new Error(`No mapping found for path: ${oldPath}`);
    }
    
    // If paths are the same, it's a no-op
    if (oldPath === newPath) {
      return;
    }
    
    // Check if new path already has a mapping
    const conflict = this.getMapping(newPath);
    if (conflict) {
      throw new Error(`Mapping already exists for new path: ${newPath}`);
    }
    
    try {
      const result = this.updatePathStmt.run(newPath, oldPath);
      
      if (result.changes === 0) {
        throw new Error(`Failed to update mapping for path: ${oldPath}`);
      }
    } catch (error: any) {
      // Handle unique constraint violations
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message.includes('UNIQUE constraint failed')) {
        throw new Error(`Mapping already exists for new path: ${newPath}`);
      }
      throw error;
    }
  }

  /**
   * Delete task mapping
   * 
   * @param kiroPath - Kiro task path to delete
   * @returns true if mapping was deleted, false if it didn't exist
   */
  deleteMapping(kiroPath: string): boolean {
    const result = this.deleteStmt.run(kiroPath);
    return result.changes > 0;
  }

  /**
   * Get all mappings for a specific spec
   * 
   * @param specId - Spec ID to filter by
   * @returns Array of TaskMapping objects
   */
  getMappingsBySpec(specId: string): TaskMapping[] {
    const stmt = this.db.prepare(`
      SELECT 
        kiro_path as kiroPath,
        cirvoy_id as cirvoyId,
        spec_id as specId,
        last_synced_at as lastSyncedAt,
        last_sync_direction as lastSyncDirection,
        version
      FROM task_mappings
      WHERE spec_id = ?
      ORDER BY kiro_path
    `);
    
    const rows = stmt.all(specId) as any[];
    
    return rows.map(row => ({
      kiroPath: row.kiroPath,
      cirvoyId: row.cirvoyId,
      specId: row.specId,
      lastSyncedAt: new Date(row.lastSyncedAt),
      lastSyncDirection: row.lastSyncDirection,
      version: row.version,
    }));
  }

  /**
   * Update sync metadata for a mapping
   * 
   * @param kiroPath - Kiro task path
   * @param direction - Direction of the sync operation
   */
  updateSyncMetadata(
    kiroPath: string,
    direction: 'kiro-to-cirvoy' | 'cirvoy-to-kiro'
  ): void {
    const stmt = this.db.prepare(`
      UPDATE task_mappings
      SET 
        last_synced_at = ?,
        last_sync_direction = ?,
        version = version + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE kiro_path = ?
    `);
    
    const result = stmt.run(new Date().toISOString(), direction, kiroPath);
    
    if (result.changes === 0) {
      throw new Error(`No mapping found for path: ${kiroPath}`);
    }
  }

  /**
   * Convert Cirvoy task to Kiro task format
   * 
   * @param cirvoyTask - Task in Cirvoy format
   * @returns Task in Kiro format
   * 
   * Requirement 11.3: Convert task status values between formats
   * Requirement 11.4: Preserve Unicode characters in all text fields
   */
  toKiroTask(cirvoyTask: CirvoyTask): KiroTask {
    // Get the mapping to find the Kiro path
    const mapping = this.getMappingByCirvoyId(cirvoyTask.id);
    if (!mapping) {
      throw new Error(`No mapping found for Cirvoy task ID: ${cirvoyTask.id}`);
    }

    // Convert status from Cirvoy format to Kiro format
    const kiroStatus = this.cirvoyStatusToKiro(cirvoyTask.status);

    // Extract task ID from path (e.g., ".kiro/specs/feature/tasks.md#1.1" -> "1.1")
    const taskIdMatch = mapping.kiroPath.match(/#(.+)$/);
    const taskId = taskIdMatch ? taskIdMatch[1] : '';

    return {
      path: mapping.kiroPath,
      taskId,
      title: cirvoyTask.title, // Unicode preserved
      status: kiroStatus,
      specPath: mapping.specId,
      metadata: cirvoyTask.metadata,
    };
  }

  /**
   * Convert Kiro task to Cirvoy task format
   * 
   * @param kiroTask - Task in Kiro format
   * @param projectId - Cirvoy project ID (required for Cirvoy tasks)
   * @returns Task in Cirvoy format
   * 
   * Requirement 11.3: Convert task status values between formats
   * Requirement 11.4: Preserve Unicode characters in all text fields
   */
  toCirvoyTask(kiroTask: KiroTask, projectId: number): CirvoyTask {
    // Get the mapping to find the Cirvoy ID
    const mapping = this.getMapping(kiroTask.path);
    if (!mapping) {
      throw new Error(`No mapping found for Kiro task path: ${kiroTask.path}`);
    }

    // Convert status from Kiro format to Cirvoy format
    const cirvoyStatus = this.kiroStatusToCirvoy(kiroTask.status);

    return {
      id: mapping.cirvoyId,
      title: kiroTask.title, // Unicode preserved
      status: cirvoyStatus,
      project_id: projectId,
      description: kiroTask.metadata?.description,
      metadata: kiroTask.metadata,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Convert Kiro status to Cirvoy status format
   * 
   * Kiro uses underscore format: not_started, queued, in_progress, completed
   * Cirvoy uses hyphen format: not-started, queued, in-progress, completed
   * 
   * @param kiroStatus - Status in Kiro format
   * @returns Status in Cirvoy format
   */
  private kiroStatusToCirvoy(kiroStatus: KiroTaskStatus): string {
    const statusMap: Record<KiroTaskStatus, string> = {
      'not_started': 'not-started',
      'queued': 'queued',
      'in_progress': 'in-progress',
      'completed': 'completed',
    };

    return statusMap[kiroStatus];
  }

  /**
   * Convert Cirvoy status to Kiro status format
   * 
   * Cirvoy uses hyphen format: not-started, queued, in-progress, completed
   * Kiro uses underscore format: not_started, queued, in_progress, completed
   * 
   * @param cirvoyStatus - Status in Cirvoy format
   * @returns Status in Kiro format
   */
  private cirvoyStatusToKiro(cirvoyStatus: string): KiroTaskStatus {
    const statusMap: Record<string, KiroTaskStatus> = {
      'not-started': 'not_started',
      'queued': 'queued',
      'in-progress': 'in_progress',
      'completed': 'completed',
    };

    const kiroStatus = statusMap[cirvoyStatus];
    if (!kiroStatus) {
      throw new Error(`Unknown Cirvoy status: ${cirvoyStatus}`);
    }

    return kiroStatus;
  }

  /**
   * Validate Kiro task data against schema
   * 
   * @param task - Task object to validate
   * @returns ValidationResult with detailed error messages
   * 
   * Requirement 11.1: Validate task data against schema before synchronization
   * Requirement 11.2: Reject invalid data and log validation errors
   */
  validateKiroTask(task: any): ValidationResult {
    const validate = this.ajv.getSchema('kiroTask');
    if (!validate) {
      throw new Error('KiroTask schema not found');
    }

    const valid = validate(task);

    if (valid) {
      return {
        valid: true,
        errors: [],
      };
    }

    // Convert AJV errors to ValidationError format with detailed messages
    const errors: ValidationError[] = (validate.errors || []).map(error => {
      const field = error.instancePath ? error.instancePath.substring(1) : error.params.missingProperty || 'unknown';
      let message = '';
      
      switch (error.keyword) {
        case 'required':
          message = `Missing required field: ${error.params.missingProperty}`;
          break;
        case 'type':
          message = `Field '${field}' must be of type ${error.params.type}, but got ${typeof error.data}`;
          break;
        case 'minLength':
          message = `Field '${field}' must have at least ${error.params.limit} characters`;
          break;
        case 'enum':
          message = `Field '${field}' must be one of: ${error.params.allowedValues.join(', ')}`;
          break;
        case 'pattern':
          message = `Field '${field}' does not match required pattern: ${error.params.pattern}`;
          break;
        case 'additionalProperties':
          message = `Unknown field: ${error.params.additionalProperty}`;
          break;
        default:
          message = error.message || 'Validation failed';
      }

      return {
        field,
        message,
        value: error.data,
      };
    });

    return {
      valid: false,
      errors,
    };
  }

  /**
   * Validate Cirvoy task data against schema
   * 
   * @param task - Task object to validate
   * @returns ValidationResult with detailed error messages
   * 
   * Requirement 11.1: Validate task data against schema before synchronization
   * Requirement 11.2: Reject invalid data and log validation errors
   */
  validateCirvoyTask(task: any): ValidationResult {
    const validate = this.ajv.getSchema('cirvoyTask');
    if (!validate) {
      throw new Error('CirvoyTask schema not found');
    }

    const valid = validate(task);

    if (valid) {
      return {
        valid: true,
        errors: [],
      };
    }

    // Convert AJV errors to ValidationError format with detailed messages
    const errors: ValidationError[] = (validate.errors || []).map(error => {
      const field = error.instancePath ? error.instancePath.substring(1) : error.params.missingProperty || 'unknown';
      let message = '';
      
      switch (error.keyword) {
        case 'required':
          message = `Missing required field: ${error.params.missingProperty}`;
          break;
        case 'type':
          message = `Field '${field}' must be of type ${error.params.type}, but got ${typeof error.data}`;
          break;
        case 'minLength':
          message = `Field '${field}' must have at least ${error.params.limit} characters`;
          break;
        case 'minimum':
          message = `Field '${field}' must be at least ${error.params.limit}`;
          break;
        case 'format':
          message = `Field '${field}' must be in ${error.params.format} format`;
          break;
        case 'additionalProperties':
          message = `Unknown field: ${error.params.additionalProperty}`;
          break;
        default:
          message = error.message || 'Validation failed';
      }

      return {
        field,
        message,
        value: error.data,
      };
    });

    return {
      valid: false,
      errors,
    };
  }
}

/**
 * Create a TaskMapper instance
 * 
 * @param db - Database instance
 * @returns TaskMapper instance
 */
export function createTaskMapper(db: Database.Database): TaskMapper {
  return new TaskMapper(db);
}
