// Life Data Repository implementation

import { LifeDataRepository, ProcessedLifeData } from '../services/dataProcessing';
import { LifeDomain } from '../models/common';
import { v4 as uuidv4 } from 'uuid';

// Mock implementation - in production this would use a real database with proper indexing
export class LifeDataRepositoryImpl implements LifeDataRepository {
  private data: Map<string, ProcessedLifeData> = new Map();
  private userIndex: Map<string, Set<string>> = new Map();
  private domainIndex: Map<string, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private dateIndex: Map<string, Set<string>> = new Map();

  async store(data: ProcessedLifeData): Promise<void> {
    // Store the data
    this.data.set(data.id, data);

    // Update indexes
    this.updateIndexes(data);
  }

  async query(
    userId: string,
    filters: {
      domain?: LifeDomain;
      tags?: string[];
      dateRange?: { start: Date; end: Date };
      limit?: number;
      offset?: number;
    }
  ): Promise<ProcessedLifeData[]> {
    let results: ProcessedLifeData[] = [];

    // Start with user's data
    const userDataIds = this.userIndex.get(userId) || new Set();
    let candidateIds = new Set(userDataIds);

    // Apply domain filter
    if (filters.domain) {
      const domainKey = `${userId}:${filters.domain}`;
      const domainDataIds = this.domainIndex.get(domainKey) || new Set();
      candidateIds = new Set([...candidateIds].filter(id => domainDataIds.has(id)));
    }

    // Apply tag filters
    if (filters.tags && filters.tags.length > 0) {
      for (const tag of filters.tags) {
        const tagKey = `${userId}:${tag}`;
        const tagDataIds = this.tagIndex.get(tagKey) || new Set();
        candidateIds = new Set([...candidateIds].filter(id => tagDataIds.has(id)));
      }
    }

    // Convert to actual data objects
    for (const id of candidateIds) {
      const data = this.data.get(id);
      if (data) {
        results.push(data);
      }
    }

    // Apply date range filter
    if (filters.dateRange) {
      results = results.filter(data => {
        const timestamp = data.timestamp.getTime();
        const start = filters.dateRange!.start.getTime();
        const end = filters.dateRange!.end.getTime();
        return timestamp >= start && timestamp <= end;
      });
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    results = results.slice(offset, offset + limit);

    return results;
  }

  async update(id: string, updates: Partial<ProcessedLifeData>): Promise<void> {
    const existingData = this.data.get(id);
    if (!existingData) {
      throw new Error(`Data with id ${id} not found`);
    }

    // Remove from old indexes
    this.removeFromIndexes(existingData);

    // Apply updates
    const updatedData = { ...existingData, ...updates };
    this.data.set(id, updatedData);

    // Update indexes with new data
    this.updateIndexes(updatedData);
  }

  async delete(id: string): Promise<void> {
    const data = this.data.get(id);
    if (data) {
      // Remove from indexes
      this.removeFromIndexes(data);
      
      // Remove from main storage
      this.data.delete(id);
    }
  }

  // Helper methods for index management

  private updateIndexes(data: ProcessedLifeData): void {
    // User index
    if (!this.userIndex.has(data.userId)) {
      this.userIndex.set(data.userId, new Set());
    }
    this.userIndex.get(data.userId)!.add(data.id);

    // Domain index
    const domainKey = `${data.userId}:${data.domain}`;
    if (!this.domainIndex.has(domainKey)) {
      this.domainIndex.set(domainKey, new Set());
    }
    this.domainIndex.get(domainKey)!.add(data.id);

    // Tag index
    for (const tag of data.tags) {
      const tagKey = `${data.userId}:${tag}`;
      if (!this.tagIndex.has(tagKey)) {
        this.tagIndex.set(tagKey, new Set());
      }
      this.tagIndex.get(tagKey)!.add(data.id);
    }

    // Date index (by day)
    const dateKey = `${data.userId}:${data.timestamp.toISOString().split('T')[0]}`;
    if (!this.dateIndex.has(dateKey)) {
      this.dateIndex.set(dateKey, new Set());
    }
    this.dateIndex.get(dateKey)!.add(data.id);
  }

  private removeFromIndexes(data: ProcessedLifeData): void {
    // User index
    this.userIndex.get(data.userId)?.delete(data.id);

    // Domain index
    const domainKey = `${data.userId}:${data.domain}`;
    this.domainIndex.get(domainKey)?.delete(data.id);

    // Tag index
    for (const tag of data.tags) {
      const tagKey = `${data.userId}:${tag}`;
      this.tagIndex.get(tagKey)?.delete(data.id);
    }

    // Date index
    const dateKey = `${data.userId}:${data.timestamp.toISOString().split('T')[0]}`;
    this.dateIndex.get(dateKey)?.delete(data.id);
  }

  // Additional utility methods

  async getDataStats(userId: string): Promise<{
    totalRecords: number;
    recordsByDomain: Record<LifeDomain, number>;
    recordsByTag: Record<string, number>;
    dateRange: { earliest: Date; latest: Date } | null;
  }> {
    const userDataIds = this.userIndex.get(userId) || new Set();
    const userData: ProcessedLifeData[] = [];
    
    for (const id of userDataIds) {
      const data = this.data.get(id);
      if (data) {
        userData.push(data);
      }
    }

    const stats = {
      totalRecords: userData.length,
      recordsByDomain: {} as Record<LifeDomain, number>,
      recordsByTag: {} as Record<string, number>,
      dateRange: null as { earliest: Date; latest: Date } | null
    };

    if (userData.length === 0) {
      return stats;
    }

    // Calculate domain distribution
    for (const data of userData) {
      stats.recordsByDomain[data.domain] = (stats.recordsByDomain[data.domain] || 0) + 1;
    }

    // Calculate tag distribution
    for (const data of userData) {
      for (const tag of data.tags) {
        stats.recordsByTag[tag] = (stats.recordsByTag[tag] || 0) + 1;
      }
    }

    // Calculate date range
    const timestamps = userData.map(d => d.timestamp.getTime());
    stats.dateRange = {
      earliest: new Date(Math.min(...timestamps)),
      latest: new Date(Math.max(...timestamps))
    };

    return stats;
  }

  async searchData(
    userId: string,
    searchTerm: string,
    options: {
      domains?: LifeDomain[];
      limit?: number;
    } = {}
  ): Promise<ProcessedLifeData[]> {
    const userDataIds = this.userIndex.get(userId) || new Set();
    const results: ProcessedLifeData[] = [];
    
    const searchLower = searchTerm.toLowerCase();

    for (const id of userDataIds) {
      const data = this.data.get(id);
      if (!data) continue;

      // Filter by domains if specified
      if (options.domains && !options.domains.includes(data.domain)) {
        continue;
      }

      // Search in tags
      const matchesTags = data.tags.some(tag => tag.toLowerCase().includes(searchLower));
      
      // Search in data content (basic string search)
      const dataString = JSON.stringify(data.data).toLowerCase();
      const matchesContent = dataString.includes(searchLower);

      if (matchesTags || matchesContent) {
        results.push(data);
      }

      // Apply limit
      if (options.limit && results.length >= options.limit) {
        break;
      }
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}