import * as fs from 'fs';
import * as path from 'path';

export interface KiroTask {
  id: string;
  title: string;
  status: 'not_started' | 'queued' | 'in_progress' | 'completed';
  description?: string;
  filePath: string;
  lineNumber: number;
}

/**
 * Parse tasks.md file and extract tasks
 */
export function parseTasksFile(filePath: string): KiroTask[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const tasks: KiroTask[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const taskMatch = line.match(/^- \[([ x])\] (.+)$/);
    
    if (taskMatch) {
      const [, checkbox, title] = taskMatch;
      const status = checkbox === 'x' ? 'completed' : 'not_started';
      
      // Generate unique ID from file path and line number
      const id = `${path.basename(filePath)}-${i}`;
      
      tasks.push({
        id,
        title: title.trim(),
        status,
        filePath,
        lineNumber: i,
      });
    }
  }

  return tasks;
}

/**
 * Update task status in tasks.md file
 */
export function updateTaskStatus(
  filePath: string,
  lineNumber: number,
  newStatus: 'not_started' | 'completed'
): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  if (lineNumber >= lines.length) {
    throw new Error(`Line ${lineNumber} not found in file`);
  }

  const line = lines[lineNumber];
  const checkbox = newStatus === 'completed' ? 'x' : ' ';
  
  // Replace checkbox
  lines[lineNumber] = line.replace(/^- \[([ x])\]/, `- [${checkbox}]`);

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

/**
 * Find all tasks.md files in a directory
 */
export function findTasksFiles(dir: string): string[] {
  const tasksFiles: string[] = [];

  function searchDir(currentDir: string) {
    if (!fs.existsSync(currentDir)) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      // Skip node_modules, .git, etc
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }

      if (entry.isDirectory()) {
        searchDir(fullPath);
      } else if (entry.name === 'tasks.md') {
        tasksFiles.push(fullPath);
      }
    }
  }

  searchDir(dir);
  return tasksFiles;
}

/**
 * Watch tasks.md files for changes
 */
export function watchTasksFiles(
  dir: string,
  onChange: (filePath: string, tasks: KiroTask[]) => void
): fs.FSWatcher[] {
  const tasksFiles = findTasksFiles(dir);
  const watchers: fs.FSWatcher[] = [];

  for (const file of tasksFiles) {
    const watcher = fs.watch(file, (eventType) => {
      if (eventType === 'change') {
        const tasks = parseTasksFile(file);
        onChange(file, tasks);
      }
    });
    watchers.push(watcher);
  }

  return watchers;
}
