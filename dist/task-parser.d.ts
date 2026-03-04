import * as fs from 'fs';
export interface KiroTask {
    title: string;
    status: 'not_started' | 'completed';
    filePath: string;
    lineNumber: number;
}
/**
 * Parse a tasks.md file and extract tasks from markdown checkboxes.
 * Handles formats like:
 *   - [ ] Task title
 *   - [x] Completed task
 *   - [ ] 1.1 Numbered task
 */
export declare function parseTasksFile(filePath: string): KiroTask[];
/**
 * Find all tasks.md files in a workspace.
 * Prioritizes .kiro/specs/ directories (Kiro's native location).
 */
export declare function findTasksFiles(workspaceDir: string): string[];
/**
 * Watch tasks.md files for changes with debounce.
 */
export declare function watchTasksFiles(workspaceDir: string, onChange: (filePath: string, tasks: KiroTask[]) => void, debounceMs?: number): fs.FSWatcher[];
//# sourceMappingURL=task-parser.d.ts.map