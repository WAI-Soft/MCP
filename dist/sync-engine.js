import axios from 'axios';
import { parseTasksFile, findTasksFiles, watchTasksFiles } from './task-parser.js';
import * as fs from 'fs';
import * as path from 'path';
export class SyncEngine {
    constructor(config) {
        this.state = { mappings: {} };
        this.watchers = [];
        this.syncing = false;
        this.config = config;
        this.stateFilePath = path.join(config.workspaceDir, '.cirvoy-sync.json');
        this.api = axios.create({
            baseURL: config.cirvoyBaseUrl,
            headers: {
                'Authorization': `Bearer ${config.cirvoyApiToken}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
        this.loadState();
    }
    async start() {
        console.error('🔄 SyncEngine starting...');
        console.error(`📂 Workspace: ${this.config.workspaceDir}`);
        console.error(`🌐 Cirvoy API: ${this.config.cirvoyBaseUrl}`);
        console.error(`📋 Project ID: ${this.config.cirvoyProjectId}`);
        // Initial sync on startup
        await this.fullSync();
        // Watch for file changes
        this.watchers = watchTasksFiles(this.config.workspaceDir, (filePath, tasks) => {
            this.onFileChanged(filePath, tasks);
        });
        const fileCount = this.watchers.length;
        console.error(`✅ SyncEngine running - watching ${fileCount} file(s)`);
    }
    stop() {
        for (const w of this.watchers)
            w.close();
        this.watchers = [];
        console.error('🛑 SyncEngine stopped');
    }
    /**
     * Full sync: scan all tasks.md files, create/update in Cirvoy
     */
    async fullSync() {
        const files = findTasksFiles(this.config.workspaceDir);
        console.error(`📑 Found ${files.length} tasks file(s)`);
        for (const file of files) {
            const tasks = parseTasksFile(file);
            await this.syncTasks(tasks);
        }
    }
    /**
     * Handle file change event
     */
    async onFileChanged(filePath, tasks) {
        const relPath = path.relative(this.config.workspaceDir, filePath);
        console.error(`📝 Change detected: ${relPath}`);
        await this.syncTasks(tasks);
    }
    /**
     * Sync a list of parsed Kiro tasks to Cirvoy
     */
    async syncTasks(tasks) {
        if (this.syncing)
            return;
        this.syncing = true;
        try {
            for (const task of tasks) {
                const key = this.taskKey(task);
                const mapping = this.state.mappings[key];
                const cirvoyStatus = task.status === 'completed' ? 'done' : 'todo';
                if (!mapping) {
                    // New task → create in Cirvoy
                    await this.createTask(task, key, cirvoyStatus);
                }
                else if (mapping.lastStatus !== cirvoyStatus) {
                    // Status changed → update in Cirvoy
                    await this.updateTask(task, key, mapping.cirvoyId, cirvoyStatus);
                }
            }
        }
        finally {
            this.syncing = false;
        }
    }
    async createTask(task, key, cirvoyStatus) {
        try {
            const response = await this.api.post('/tasks', {
                project_id: parseInt(this.config.cirvoyProjectId, 10),
                title: task.title,
                status: cirvoyStatus,
                priority: 'medium',
            });
            const cirvoyId = response.data?.data?.id;
            if (cirvoyId) {
                this.state.mappings[key] = { cirvoyId, lastStatus: cirvoyStatus };
                this.saveState();
                console.error(`  ✅ Created: "${task.title}" → Cirvoy #${cirvoyId}`);
            }
        }
        catch (err) {
            console.error(`  ❌ Failed to create "${task.title}": ${err.response?.data?.error || err.message}`);
        }
    }
    async updateTask(task, key, cirvoyId, cirvoyStatus) {
        try {
            const updateData = { status: cirvoyStatus };
            if (cirvoyStatus === 'done')
                updateData.progress = 100;
            await this.api.put(`/tasks/${cirvoyId}`, updateData);
            this.state.mappings[key].lastStatus = cirvoyStatus;
            this.saveState();
            console.error(`  ✅ Updated: "${task.title}" → ${cirvoyStatus}`);
        }
        catch (err) {
            console.error(`  ❌ Failed to update "${task.title}": ${err.response?.data?.error || err.message}`);
        }
    }
    /**
     * Unique key for a task: relative file path + title
     */
    taskKey(task) {
        const relPath = path.relative(this.config.workspaceDir, task.filePath);
        return `${relPath}::${task.title}`;
    }
    loadState() {
        try {
            if (fs.existsSync(this.stateFilePath)) {
                const raw = fs.readFileSync(this.stateFilePath, 'utf-8');
                this.state = JSON.parse(raw);
            }
        }
        catch {
            this.state = { mappings: {} };
        }
    }
    saveState() {
        try {
            fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf-8');
        }
        catch (err) {
            console.error(`Failed to save sync state: ${err.message}`);
        }
    }
}
//# sourceMappingURL=sync-engine.js.map