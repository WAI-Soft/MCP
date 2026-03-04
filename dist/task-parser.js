import * as fs from 'fs';
import * as path from 'path';
/**
 * Parse a tasks.md file and extract tasks from markdown checkboxes.
 * Handles formats like:
 *   - [ ] Task title
 *   - [x] Completed task
 *   - [ ] 1.1 Numbered task
 */
export function parseTasksFile(filePath) {
    if (!fs.existsSync(filePath))
        return [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const tasks = [];
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^\s*- \[([ xX])\]\s+(.+)$/);
        if (match) {
            tasks.push({
                title: match[2].trim(),
                status: match[1].toLowerCase() === 'x' ? 'completed' : 'not_started',
                filePath,
                lineNumber: i,
            });
        }
    }
    return tasks;
}
/**
 * Find all tasks.md files in a workspace.
 * Prioritizes .kiro/specs/ directories (Kiro's native location).
 */
export function findTasksFiles(workspaceDir) {
    const results = [];
    const kiroSpecsDir = path.join(workspaceDir, '.kiro', 'specs');
    if (fs.existsSync(kiroSpecsDir)) {
        searchDir(kiroSpecsDir, results);
    }
    const rootTasks = path.join(workspaceDir, 'tasks.md');
    if (fs.existsSync(rootTasks) && !results.includes(rootTasks)) {
        results.push(rootTasks);
    }
    return results;
}
function searchDir(dir, results) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    }
    catch {
        return;
    }
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            searchDir(fullPath, results);
        }
        else if (entry.name === 'tasks.md') {
            results.push(fullPath);
        }
    }
}
/**
 * Watch tasks.md files for changes with debounce.
 */
export function watchTasksFiles(workspaceDir, onChange, debounceMs = 500) {
    const files = findTasksFiles(workspaceDir);
    const watchers = [];
    const timers = new Map();
    for (const file of files) {
        try {
            const watcher = fs.watch(file, (eventType) => {
                if (eventType !== 'change')
                    return;
                const existing = timers.get(file);
                if (existing)
                    clearTimeout(existing);
                timers.set(file, setTimeout(() => {
                    timers.delete(file);
                    try {
                        const tasks = parseTasksFile(file);
                        onChange(file, tasks);
                    }
                    catch (err) {
                        console.error(`Error parsing ${file}:`, err.message);
                    }
                }, debounceMs));
            });
            watchers.push(watcher);
            console.error(`👁️  Watching: ${path.relative(workspaceDir, file)}`);
        }
        catch (err) {
            console.error(`Cannot watch ${file}:`, err.message);
        }
    }
    return watchers;
}
//# sourceMappingURL=task-parser.js.map