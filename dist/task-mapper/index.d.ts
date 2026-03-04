/**
 * Task Mapper module
 *
 * Provides CRUD operations for task mappings between Kiro and Cirvoy systems.
 * Maintains mappings in SQLite database with unique constraints and optimized queries.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
import Database from 'better-sqlite3';
import { TaskMapping, KiroTask, CirvoyTask, ValidationResult } from '../types/task';
/**
 * Task Mapper class for managing task mappings
 *
 * Provides CRUD operations with:
 * - Unique constraint handling for kiro_path and cirvoy_id
 * - Query performance <100ms (Requirement 3.3)
 * - Support for task relocations (Requirement 3.4)
 */
export declare class TaskMapper {
    private db;
    private ajv;
    private insertStmt;
    private selectByKiroPathStmt;
    private selectByCirvoyIdStmt;
    private updatePathStmt;
    private deleteStmt;
    constructor(db: Database.Database);
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
    createMapping(kiroPath: string, cirvoyId: number, specId: string, lastSyncDirection?: 'kiro-to-cirvoy' | 'cirvoy-to-kiro'): void;
    /**
     * Get task mapping by Kiro path
     *
     * @param kiroPath - Kiro task path to look up
     * @returns TaskMapping if found, null otherwise
     *
     * Requirement 3.3: Return results within 100 milliseconds
     * Uses prepared statement and indexed query for optimal performance
     */
    getMapping(kiroPath: string): TaskMapping | null;
    /**
     * Get task mapping by Cirvoy ID
     *
     * @param cirvoyId - Cirvoy task ID to look up
     * @returns TaskMapping if found, null otherwise
     *
     * Requirement 3.3: Return results within 100 milliseconds
     * Uses prepared statement and indexed query for optimal performance
     */
    getMappingByCirvoyId(cirvoyId: number): TaskMapping | null;
    /**
     * Update task mapping when task file is relocated
     *
     * @param oldPath - Current Kiro task path
     * @param newPath - New Kiro task path after relocation
     * @throws Error if oldPath doesn't exist or newPath already exists
     *
     * Requirement 3.4: Handle task file relocations by updating mappings
     */
    updateMapping(oldPath: string, newPath: string): void;
    /**
     * Delete task mapping
     *
     * @param kiroPath - Kiro task path to delete
     * @returns true if mapping was deleted, false if it didn't exist
     */
    deleteMapping(kiroPath: string): boolean;
    /**
     * Get all mappings for a specific spec
     *
     * @param specId - Spec ID to filter by
     * @returns Array of TaskMapping objects
     */
    getMappingsBySpec(specId: string): TaskMapping[];
    /**
     * Update sync metadata for a mapping
     *
     * @param kiroPath - Kiro task path
     * @param direction - Direction of the sync operation
     */
    updateSyncMetadata(kiroPath: string, direction: 'kiro-to-cirvoy' | 'cirvoy-to-kiro'): void;
    /**
     * Convert Cirvoy task to Kiro task format
     *
     * @param cirvoyTask - Task in Cirvoy format
     * @returns Task in Kiro format
     *
     * Requirement 11.3: Convert task status values between formats
     * Requirement 11.4: Preserve Unicode characters in all text fields
     */
    toKiroTask(cirvoyTask: CirvoyTask): KiroTask;
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
    toCirvoyTask(kiroTask: KiroTask, projectId: number): CirvoyTask;
    /**
     * Convert Kiro status to Cirvoy status format
     *
     * Kiro uses underscore format: not_started, queued, in_progress, completed
     * Cirvoy uses hyphen format: not-started, queued, in-progress, completed
     *
     * @param kiroStatus - Status in Kiro format
     * @returns Status in Cirvoy format
     */
    private kiroStatusToCirvoy;
    /**
     * Convert Cirvoy status to Kiro status format
     *
     * Cirvoy uses hyphen format: not-started, queued, in-progress, completed
     * Kiro uses underscore format: not_started, queued, in_progress, completed
     *
     * @param cirvoyStatus - Status in Cirvoy format
     * @returns Status in Kiro format
     */
    private cirvoyStatusToKiro;
    /**
     * Validate Kiro task data against schema
     *
     * @param task - Task object to validate
     * @returns ValidationResult with detailed error messages
     *
     * Requirement 11.1: Validate task data against schema before synchronization
     * Requirement 11.2: Reject invalid data and log validation errors
     */
    validateKiroTask(task: any): ValidationResult;
    /**
     * Validate Cirvoy task data against schema
     *
     * @param task - Task object to validate
     * @returns ValidationResult with detailed error messages
     *
     * Requirement 11.1: Validate task data against schema before synchronization
     * Requirement 11.2: Reject invalid data and log validation errors
     */
    validateCirvoyTask(task: any): ValidationResult;
}
/**
 * Create a TaskMapper instance
 *
 * @param db - Database instance
 * @returns TaskMapper instance
 */
export declare function createTaskMapper(db: Database.Database): TaskMapper;
//# sourceMappingURL=index.d.ts.map