import axios, { AxiosInstance } from 'axios';
import { updateTaskStatus, watchTasksFiles, KiroTask } from './task-parser.js';
import * as path from 'path';

export interface SyncEngineConfig {
  cirvoyBaseUrl: string;
  cirvoyApiToken: string;
  cirvoyProjectId: string;
  workspaceDir: string;
}

export class SyncEngine {
  private api: AxiosInstance;
  private config: SyncEngineConfig;
  private taskMapping: Map<string, number> = new Map(); // Kiro task ID -> Cirvoy task ID
  private watchers: any[] = [];

  constructor(config: SyncEngineConfig) {
    this.config = config;
    this.api = axios.create({
      baseURL: config.cirvoyBaseUrl,
      headers: {
        'Authorization': `Bearer ${config.cirvoyApiToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Start syncing
   */
  async start(): Promise<void> {
    console.error('🔄 Starting sync engine...');

    // Initial sync: Load existing tasks from Cirvoy
    await this.loadExistingTasks();

    // Watch for changes in Kiro tasks
    this.watchers = watchTasksFiles(this.config.workspaceDir, (filePath, tasks) => {
      this.onKiroTasksChanged(filePath, tasks);
    });

    console.error('✅ Sync engine started');
  }

  /**
   * Stop syncing
   */
  stop(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
    console.error('🛑 Sync engine stopped');
  }

  /**
   * Load existing tasks from Cirvoy and build mapping
   */
  private async loadExistingTasks(): Promise<void> {
    try {
      const response = await this.api.get('/tasks', {
        params: { project_id: this.config.cirvoyProjectId },
      });

      const cirvoyTasks = response.data.data || [];
      console.error(`📥 Loaded ${cirvoyTasks.length} tasks from Cirvoy`);

      // Build mapping based on task titles (simple approach)
      for (const task of cirvoyTasks) {
        // Store by title for now (we'll improve this later)
        this.taskMapping.set(task.title, task.id);
      }
    } catch (error: any) {
      console.error('❌ Error loading tasks from Cirvoy:', error.message);
    }
  }

  /**
   * Handle changes in Kiro tasks
   */
  private async onKiroTasksChanged(filePath: string, tasks: KiroTask[]): Promise<void> {
    console.error(`📝 Tasks changed in ${path.basename(filePath)}`);

    for (const task of tasks) {
      await this.syncTaskToCirvoy(task);
    }
  }

  /**
   * Sync a Kiro task to Cirvoy
   */
  private async syncTaskToCirvoy(kiroTask: KiroTask): Promise<void> {
    try {
      const cirvoyTaskId = this.taskMapping.get(kiroTask.title);

      if (cirvoyTaskId) {
        // Update existing task
        const cirvoyStatus = this.mapKiroStatusToCirvoy(kiroTask.status);
        
        await this.api.put(`/tasks/${cirvoyTaskId}`, {
          status: cirvoyStatus,
          progress: kiroTask.status === 'completed' ? 100 : 0,
        });

        console.error(`✅ Updated task in Cirvoy: ${kiroTask.title}`);
      } else {
        // Create new task
        const response = await this.api.post('/tasks', {
          project_id: this.config.cirvoyProjectId,
          title: kiroTask.title,
          description: kiroTask.description || '',
          status: this.mapKiroStatusToCirvoy(kiroTask.status),
          priority: 'medium',
        });

        const newTaskId = response.data.data.id;
        this.taskMapping.set(kiroTask.title, newTaskId);

        console.error(`✅ Created task in Cirvoy: ${kiroTask.title}`);
      }
    } catch (error: any) {
      console.error(`❌ Error syncing task "${kiroTask.title}":`, error.message);
    }
  }

  /**
   * Sync a Cirvoy task to Kiro
   */
  async syncTaskToKiro(cirvoyTask: any): Promise<void> {
    try {
      // Find the Kiro task by title
      const kiroTaskId = Array.from(this.taskMapping.entries())
        .find(([_, id]) => id === cirvoyTask.id)?.[0];

      if (!kiroTaskId) {
        console.error(`⚠️ Task not found in Kiro: ${cirvoyTask.title}`);
        return;
      }

      // Parse task ID to get file path and line number
      const [fileName, lineStr] = kiroTaskId.split('-');
      const lineNumber = parseInt(lineStr, 10);

      // Find the file
      const tasksFiles = require('./task-parser.js').findTasksFiles(this.config.workspaceDir);
      const filePath = tasksFiles.find((f: string) => path.basename(f) === fileName);

      if (!filePath) {
        console.error(`⚠️ File not found: ${fileName}`);
        return;
      }

      // Update task status
      const kiroStatus = this.mapCirvoyStatusToKiro(cirvoyTask.status);
      updateTaskStatus(filePath, lineNumber, kiroStatus);

      console.error(`✅ Updated task in Kiro: ${cirvoyTask.title}`);
    } catch (error: any) {
      console.error(`❌ Error syncing task to Kiro:`, error.message);
    }
  }

  /**
   * Map Kiro status to Cirvoy status
   */
  private mapKiroStatusToCirvoy(kiroStatus: string): string {
    const mapping: Record<string, string> = {
      'not_started': 'todo',
      'queued': 'todo',
      'in_progress': 'in_progress',
      'completed': 'done',
    };
    return mapping[kiroStatus] || 'todo';
  }

  /**
   * Map Cirvoy status to Kiro status
   */
  private mapCirvoyStatusToKiro(cirvoyStatus: string): 'not_started' | 'completed' {
    return cirvoyStatus === 'done' ? 'completed' : 'not_started';
  }
}
