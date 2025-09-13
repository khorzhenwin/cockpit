// Data Source Repository implementation

import { DataSource, DataSourceRepository as IDataSourceRepository } from '../services/dataIngestion';
import { SyncSchedule } from '../models/common';
import { v4 as uuidv4 } from 'uuid';

// Mock implementation - in production this would use a real database
export class DataSourceRepository implements IDataSourceRepository {
  private dataSources: Map<string, DataSource> = new Map();

  async create(dataSource: Omit<DataSource, 'id'>): Promise<DataSource> {
    const id = uuidv4();
    const newDataSource: DataSource = {
      ...dataSource,
      id
    };
    
    this.dataSources.set(id, newDataSource);
    return newDataSource;
  }

  async findById(id: string): Promise<DataSource | null> {
    return this.dataSources.get(id) || null;
  }

  async findByUserId(userId: string): Promise<DataSource[]> {
    return Array.from(this.dataSources.values()).filter(ds => ds.userId === userId);
  }

  async updateCredentials(id: string, encryptedCredentials: string): Promise<void> {
    const dataSource = this.dataSources.get(id);
    if (dataSource) {
      dataSource.credentials = encryptedCredentials;
      dataSource.updatedAt = new Date();
      this.dataSources.set(id, dataSource);
    }
  }

  async updateSyncStatus(id: string, status: {
    lastSync?: Date;
    nextSync?: Date;
    status?: string;
    errorMessage?: string | null;
  }): Promise<void> {
    const dataSource = this.dataSources.get(id);
    if (dataSource) {
      if (status.lastSync) dataSource.lastSync = status.lastSync;
      if (status.nextSync) dataSource.nextSync = status.nextSync;
      if (status.status) dataSource.status = status.status as any;
      if (status.errorMessage !== undefined) dataSource.errorMessage = status.errorMessage;
      dataSource.updatedAt = new Date();
      this.dataSources.set(id, dataSource);
    }
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const dataSource = this.dataSources.get(id);
    if (dataSource) {
      dataSource.status = status as any;
      dataSource.updatedAt = new Date();
      this.dataSources.set(id, dataSource);
    }
  }

  async update(id: string, updates: Partial<DataSource>): Promise<void> {
    const dataSource = this.dataSources.get(id);
    if (dataSource) {
      Object.assign(dataSource, updates);
      dataSource.updatedAt = new Date();
      this.dataSources.set(id, dataSource);
    }
  }

  async delete(id: string): Promise<void> {
    this.dataSources.delete(id);
  }
}