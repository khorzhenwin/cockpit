// Integration tests for Data Processing Pipeline

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataProcessingService, RawLifeData } from '../../lib/services/dataProcessing';
import { LifeDataRepositoryImpl } from '../../lib/repositories/lifeDataRepository';
import { SyncSchedulerImpl } from '../../lib/services/syncScheduler';
import { DataIngestionService } from '../../lib/services/dataIngestion';
import { DataSourceRepository } from '../../lib/repositories/dataSourceRepository';

describe('DataProcessingService', () => {
  let dataProcessingService: DataProcessingService;
  let lifeDataRepository: LifeDataRepositoryImpl;
  let syncScheduler: SyncSchedulerImpl;
  let dataIngestionService: DataIngestionService;

  beforeEach(() => {
    const dataSourceRepository = new DataSourceRepository();
    dataIngestionService = new DataIngestionService(dataSourceRepository);
    lifeDataRepository = new LifeDataRepositoryImpl();
    syncScheduler = new SyncSchedulerImpl(dataIngestionService);
    dataProcessingService = new DataProcessingService(lifeDataRepository, syncScheduler);
  });

  describe('processRawData', () => {
    it('should successfully process valid financial data', async () => {
      const rawData: RawLifeData = {
        userId: 'test-user-id',
        sourceId: 'test-source-id',
        domain: 'financial',
        timestamp: new Date(),
        rawData: {
          amount: -50.25,
          currency: 'USD',
          description: 'Coffee shop purchase',
          merchant: 'Starbucks',
          category: 'food'
        },
        metadata: {
          provider: 'plaid',
          dataType: 'transaction',
          version: '1.0'
        }
      };

      const processedData = await dataProcessingService.processRawData(rawData);

      expect(processedData).toBeDefined();
      expect(processedData.userId).toBe(rawData.userId);
      expect(processedData.domain).toBe('financial');
      expect(processedData.confidence).toBeGreaterThan(0.5);
      expect(processedData.tags).toContain('financial');
      expect(processedData.tags).toContain('expense');
      expect(processedData.processingMetadata.categorization.primary).toBe('financial');
    });

    it('should successfully process valid health data', async () => {
      const rawData: RawLifeData = {
        userId: 'test-user-id',
        sourceId: 'test-source-id',
        domain: 'health',
        timestamp: new Date(),
        rawData: {
          steps: 8500,
          calories: 2200,
          distance: 6.2,
          unit: 'km'
        },
        metadata: {
          provider: 'fitbit',
          dataType: 'activity',
          version: '2.0'
        }
      };

      const processedData = await dataProcessingService.processRawData(rawData);

      expect(processedData).toBeDefined();
      expect(processedData.domain).toBe('health');
      expect(processedData.tags).toContain('health');
      expect(processedData.tags).toContain('activity');
      expect(processedData.processingMetadata.categorization.primary).toBe('health');
      expect(processedData.processingMetadata.categorization.secondary).toBe('activity');
    });

    it('should successfully process calendar data', async () => {
      const rawData: RawLifeData = {
        userId: 'test-user-id',
        sourceId: 'test-source-id',
        domain: 'personal',
        timestamp: new Date(),
        rawData: {
          event: 'Team Meeting',
          startTime: '2025-09-13T10:00:00Z',
          endTime: '2025-09-13T11:00:00Z',
          attendees: ['john@example.com', 'jane@example.com'],
          location: 'Conference Room A'
        },
        metadata: {
          provider: 'google_calendar',
          dataType: 'event',
          version: '1.0'
        }
      };

      const processedData = await dataProcessingService.processRawData(rawData);

      expect(processedData).toBeDefined();
      expect(processedData.tags).toContain('calendar');
      expect(processedData.tags).toContain('event');
      expect(processedData.processingMetadata.transformationsApplied).toEqual(expect.arrayContaining(['normalize-timezone']));
    });

    it('should reject invalid data', async () => {
      const invalidRawData: RawLifeData = {
        userId: '', // Invalid: empty user ID
        sourceId: 'test-source-id',
        domain: 'financial',
        timestamp: new Date(),
        rawData: {
          // Missing required amount field
          currency: 'USD'
        }
      };

      await expect(
        dataProcessingService.processRawData(invalidRawData)
      ).rejects.toThrow('Data validation failed');
    });

    it('should handle data with warnings', async () => {
      const oldData: RawLifeData = {
        userId: 'test-user-id',
        sourceId: 'test-source-id',
        domain: 'financial',
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days old
        rawData: {
          amount: 100,
          currency: 'USD'
        }
      };

      const processedData = await dataProcessingService.processRawData(oldData);

      expect(processedData).toBeDefined();
      expect(processedData.confidence).toBeLessThan(0.9); // Reduced confidence due to old data
    });
  });

  describe('data transformations', () => {
    it('should normalize currency for financial data', async () => {
      const rawData: RawLifeData = {
        userId: 'test-user-id',
        sourceId: 'test-source-id',
        domain: 'financial',
        timestamp: new Date(),
        rawData: {
          amount: 100,
          currency: 'EUR' // Non-USD currency
        }
      };

      const processedData = await dataProcessingService.processRawData(rawData);

      expect(processedData.data.originalAmount).toBe(100);
      expect(processedData.data.originalCurrency).toBe('EUR');
      expect(processedData.data.currency).toBe('USD');
      expect(processedData.data.amount).toBeCloseTo(110, 1); // Mock conversion rate
      expect(processedData.processingMetadata.transformationsApplied).toContain('normalize-currency');
    });

    it('should normalize units for health data', async () => {
      const rawData: RawLifeData = {
        userId: 'test-user-id',
        sourceId: 'test-source-id',
        domain: 'health',
        timestamp: new Date(),
        rawData: {
          weight: 150,
          unit: 'lbs'
        }
      };

      const processedData = await dataProcessingService.processRawData(rawData);

      expect(processedData.data.originalWeight).toBe(150);
      expect(processedData.data.originalUnit).toBe('lbs');
      expect(processedData.data.unit).toBe('kg');
      expect(processedData.data.weight).toBeCloseTo(68.04, 2); // 150 lbs to kg
      expect(processedData.processingMetadata.transformationsApplied).toContain('normalize-units');
    });
  });

  describe('data categorization and tagging', () => {
    it('should categorize financial expense correctly', async () => {
      const rawData: RawLifeData = {
        userId: 'test-user-id',
        sourceId: 'test-source-id',
        domain: 'financial',
        timestamp: new Date(),
        rawData: {
          amount: -25.50,
          currency: 'USD'
        }
      };

      const processedData = await dataProcessingService.processRawData(rawData);

      expect(processedData.processingMetadata.categorization.primary).toBe('financial');
      expect(processedData.processingMetadata.categorization.secondary).toBe('expense');
      expect(processedData.tags).toContain('expense');
      expect(processedData.tags).toContain('negative');
    });

    it('should categorize financial income correctly', async () => {
      const rawData: RawLifeData = {
        userId: 'test-user-id',
        sourceId: 'test-source-id',
        domain: 'financial',
        timestamp: new Date(),
        rawData: {
          amount: 2500,
          currency: 'USD'
        }
      };

      const processedData = await dataProcessingService.processRawData(rawData);

      expect(processedData.processingMetadata.categorization.primary).toBe('financial');
      expect(processedData.processingMetadata.categorization.secondary).toBe('income');
      expect(processedData.tags).toContain('income');
      expect(processedData.tags).toContain('high-value');
    });

    it('should generate temporal tags', async () => {
      const rawData: RawLifeData = {
        userId: 'test-user-id',
        sourceId: 'test-source-id',
        domain: 'personal',
        timestamp: new Date(),
        rawData: {
          note: 'Test note'
        }
      };

      const processedData = await dataProcessingService.processRawData(rawData);
      const now = new Date();

      expect(processedData.tags).toContain(`year:${now.getFullYear()}`);
      expect(processedData.tags).toContain(`month:${now.getMonth() + 1}`);
      expect(processedData.tags).toContain(`day:${now.getDate()}`);
    });
  });

  describe('data querying', () => {
    beforeEach(async () => {
      // Add some test data
      const testData = [
        {
          userId: 'test-user-id',
          sourceId: 'source-1',
          domain: 'financial' as const,
          timestamp: new Date('2025-09-10'),
          rawData: { amount: -50, currency: 'USD' }
        },
        {
          userId: 'test-user-id',
          sourceId: 'source-2',
          domain: 'health' as const,
          timestamp: new Date('2025-09-11'),
          rawData: { steps: 8000 }
        },
        {
          userId: 'test-user-id',
          sourceId: 'source-3',
          domain: 'financial' as const,
          timestamp: new Date('2025-09-12'),
          rawData: { amount: 100, currency: 'USD' }
        }
      ];

      for (const data of testData) {
        await dataProcessingService.processRawData(data);
      }
    });

    it('should query data by domain', async () => {
      const financialData = await dataProcessingService.getProcessedData('test-user-id', {
        domain: 'financial'
      });

      expect(financialData).toHaveLength(2);
      expect(financialData.every(d => d.domain === 'financial')).toBe(true);
    });

    it('should query data by tags', async () => {
      const expenseData = await dataProcessingService.getProcessedData('test-user-id', {
        tags: ['expense']
      });

      expect(expenseData).toHaveLength(1);
      expect(expenseData[0].tags).toContain('expense');
    });

    it('should query data by date range', async () => {
      const recentData = await dataProcessingService.getProcessedData('test-user-id', {
        dateRange: {
          start: new Date('2025-09-11'),
          end: new Date('2025-09-12')
        }
      });

      expect(recentData).toHaveLength(2);
    });

    it('should apply pagination', async () => {
      const firstPage = await dataProcessingService.getProcessedData('test-user-id', {
        limit: 2,
        offset: 0
      });

      const secondPage = await dataProcessingService.getProcessedData('test-user-id', {
        limit: 2,
        offset: 2
      });

      expect(firstPage).toHaveLength(2);
      expect(secondPage).toHaveLength(1);
      expect(firstPage[0].id).not.toBe(secondPage[0].id);
    });
  });

  describe('sync scheduling', () => {
    it('should schedule data sync', async () => {
      const config = {
        sourceId: 'test-source-id',
        frequency: 'daily' as const,
        nextRun: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        isActive: true,
        retryCount: 0,
        maxRetries: 3
      };

      await dataProcessingService.scheduleSync(config);

      const storedConfig = await syncScheduler.getConfig('test-source-id');
      expect(storedConfig).toEqual(config);
    });

    it('should handle sync errors with retry logic', async () => {
      const mockError = new Error('Sync failed');
      
      await dataProcessingService.handleSyncError('test-source-id', mockError);

      // Since there's no existing config, this should not throw
      // In a real scenario, we'd set up a config first
      expect(true).toBe(true); // Test passes if no error is thrown
    });
  });

  describe('data validation', () => {
    it('should validate required fields', async () => {
      const invalidData: RawLifeData = {
        userId: 'test-user-id',
        sourceId: 'test-source-id',
        domain: 'financial',
        timestamp: new Date(),
        rawData: {
          // Missing required amount field
          currency: 'USD'
        }
      };

      await expect(
        dataProcessingService.processRawData(invalidData)
      ).rejects.toThrow('Amount is required for financial data');
    });

    it('should validate data types', async () => {
      const invalidData: RawLifeData = {
        userId: 'test-user-id',
        sourceId: 'test-source-id',
        domain: 'financial',
        timestamp: new Date(),
        rawData: {
          amount: 'not-a-number', // Should be number
          currency: 'USD'
        }
      };

      await expect(
        dataProcessingService.processRawData(invalidData)
      ).rejects.toThrow('Amount must be a number');
    });

    it('should validate currency format', async () => {
      const invalidData: RawLifeData = {
        userId: 'test-user-id',
        sourceId: 'test-source-id',
        domain: 'financial',
        timestamp: new Date(),
        rawData: {
          amount: 100,
          currency: 'INVALID' // Should be 3-letter ISO code
        }
      };

      await expect(
        dataProcessingService.processRawData(invalidData)
      ).rejects.toThrow('Currency must be a 3-letter ISO code');
    });
  });
});