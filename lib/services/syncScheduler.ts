// Sync Scheduler Service implementation

import { SyncScheduler, SyncScheduleConfig } from './dataProcessing';
import { DataIngestionService } from './dataIngestion';

export class SyncSchedulerImpl implements SyncScheduler {
  private configs: Map<string, SyncScheduleConfig> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private dataIngestionService: DataIngestionService;
  private isRunning: boolean = false;

  constructor(dataIngestionService: DataIngestionService) {
    this.dataIngestionService = dataIngestionService;
  }

  async schedule(config: SyncScheduleConfig): Promise<void> {
    // Store the configuration
    this.configs.set(config.sourceId, config);

    // Clear existing timer if any
    const existingTimer = this.timers.get(config.sourceId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule next sync if active
    if (config.isActive && config.frequency !== 'manual') {
      this.scheduleNextSync(config);
    }
  }

  async getConfig(sourceId: string): Promise<SyncScheduleConfig | null> {
    return this.configs.get(sourceId) || null;
  }

  async updateConfig(config: SyncScheduleConfig): Promise<void> {
    await this.schedule(config);
  }

  async getActiveConfigs(): Promise<SyncScheduleConfig[]> {
    return Array.from(this.configs.values()).filter(config => config.isActive);
  }

  async executeScheduledSyncs(): Promise<void> {
    if (this.isRunning) {
      return; // Prevent concurrent executions
    }

    this.isRunning = true;
    
    try {
      const now = new Date();
      const activeConfigs = await this.getActiveConfigs();
      
      for (const config of activeConfigs) {
        if (config.nextRun <= now) {
          await this.executeSyncForSource(config);
        }
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the scheduler (would typically be called on application startup)
   */
  start(): void {
    // Run scheduled syncs every minute
    setInterval(() => {
      this.executeScheduledSyncs().catch(error => {
        console.error('Error executing scheduled syncs:', error);
      });
    }, 60 * 1000); // 1 minute

    console.log('Sync scheduler started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    
    console.log('Sync scheduler stopped');
  }

  /**
   * Manually trigger sync for a specific source
   */
  async triggerSync(sourceId: string): Promise<void> {
    const config = this.configs.get(sourceId);
    if (!config) {
      throw new Error(`No sync configuration found for source: ${sourceId}`);
    }

    await this.executeSyncForSource(config);
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    totalSources: number;
    activeSources: number;
    pendingSyncs: number;
    failedSources: number;
    nextSyncTime: Date | null;
  }> {
    const allConfigs = Array.from(this.configs.values());
    const activeConfigs = allConfigs.filter(c => c.isActive);
    const failedConfigs = allConfigs.filter(c => c.retryCount >= c.maxRetries);
    
    const now = new Date();
    const pendingConfigs = activeConfigs.filter(c => c.nextRun <= now);
    
    const nextSyncTimes = activeConfigs
      .filter(c => c.nextRun > now)
      .map(c => c.nextRun)
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      totalSources: allConfigs.length,
      activeSources: activeConfigs.length,
      pendingSyncs: pendingConfigs.length,
      failedSources: failedConfigs.length,
      nextSyncTime: nextSyncTimes.length > 0 ? nextSyncTimes[0] : null
    };
  }

  // Private helper methods

  private scheduleNextSync(config: SyncScheduleConfig): void {
    const delay = config.nextRun.getTime() - Date.now();
    
    if (delay > 0) {
      const timer = setTimeout(async () => {
        await this.executeSyncForSource(config);
      }, delay);
      
      this.timers.set(config.sourceId, timer);
    }
  }

  private async executeSyncForSource(config: SyncScheduleConfig): Promise<void> {
    try {
      console.log(`Executing sync for source: ${config.sourceId}`);
      
      // Update last run time
      config.lastRun = new Date();
      
      // Execute the sync
      const syncResult = await this.dataIngestionService.syncData(config.sourceId);
      
      if (syncResult.success) {
        // Reset retry count on success
        config.retryCount = 0;
        
        // Schedule next sync
        config.nextRun = this.calculateNextRun(config);
        
        console.log(`Sync completed successfully for source: ${config.sourceId}`);
      } else {
        // Handle sync failure
        await this.handleSyncFailure(config, new Error(syncResult.errors.join(', ')));
      }
      
      // Update the configuration
      await this.updateConfig(config);
      
    } catch (error) {
      console.error(`Sync failed for source ${config.sourceId}:`, error);
      await this.handleSyncFailure(config, error);
    }
  }

  private async handleSyncFailure(config: SyncScheduleConfig, error: Error): Promise<void> {
    config.retryCount++;
    
    if (config.retryCount >= config.maxRetries) {
      // Disable sync after max retries
      config.isActive = false;
      console.error(`Sync disabled for source ${config.sourceId} after ${config.maxRetries} retries`);
    } else {
      // Schedule retry with exponential backoff
      const backoffMinutes = Math.pow(2, config.retryCount) * 5; // 5, 10, 20, 40 minutes...
      config.nextRun = new Date(Date.now() + backoffMinutes * 60 * 1000);
      
      console.warn(`Sync retry scheduled for source ${config.sourceId} in ${backoffMinutes} minutes (attempt ${config.retryCount}/${config.maxRetries})`);
    }
  }

  private calculateNextRun(config: SyncScheduleConfig): Date {
    const now = new Date();
    
    switch (config.frequency) {
      case 'realtime':
        return new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
        
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
        
      case 'daily':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(6, 0, 0, 0); // 6 AM next day
        return tomorrow;
        
      case 'weekly':
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(6, 0, 0, 0); // 6 AM next week
        return nextWeek;
        
      case 'manual':
      default:
        // For manual sync, set next run far in the future
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
    }
  }

  /**
   * Create a default sync configuration
   */
  static createDefaultConfig(sourceId: string): SyncScheduleConfig {
    return {
      sourceId,
      frequency: 'daily',
      nextRun: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      isActive: true,
      retryCount: 0,
      maxRetries: 3
    };
  }

  /**
   * Validate sync configuration
   */
  static validateConfig(config: SyncScheduleConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.sourceId) {
      errors.push('Source ID is required');
    }

    if (!['realtime', 'hourly', 'daily', 'weekly', 'manual'].includes(config.frequency)) {
      errors.push('Invalid frequency');
    }

    if (!config.nextRun || !(config.nextRun instanceof Date)) {
      errors.push('Next run time is required and must be a valid date');
    }

    if (config.maxRetries < 0 || config.maxRetries > 10) {
      errors.push('Max retries must be between 0 and 10');
    }

    if (config.retryCount < 0) {
      errors.push('Retry count cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}