export interface SyncEngineConfig {
    cirvoyBaseUrl: string;
    cirvoyApiToken: string;
    cirvoyProjectId: string;
    workspaceDir: string;
}
export declare class SyncEngine {
    private api;
    private config;
    private state;
    private stateFilePath;
    private watchers;
    private syncing;
    constructor(config: SyncEngineConfig);
    start(): Promise<void>;
    stop(): void;
    /**
     * Full sync: scan all tasks.md files, create/update in Cirvoy
     */
    private fullSync;
    /**
     * Handle file change event
     */
    private onFileChanged;
    /**
     * Sync a list of parsed Kiro tasks to Cirvoy
     */
    private syncTasks;
    private createTask;
    private updateTask;
    /**
     * Unique key for a task: relative file path + title
     */
    private taskKey;
    private loadState;
    private saveState;
}
//# sourceMappingURL=sync-engine.d.ts.map