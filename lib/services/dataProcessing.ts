// Data Processing Pipeline Service

import { LifeData, LifeDomain, ValidationResult } from '../models/common';
import { v4 as uuidv4 } from 'uuid';

export interface RawLifeData {
  userId: string;
  sourceId: string;
  domain: LifeDomain;
  timestamp: Date;
  rawData: any;
  metadata?: {
    provider: string;
    dataType: string;
    version?: string;
    [key: string]: any;
  };
}

export interface ProcessedLifeData extends LifeData {
  id: string;
  createdAt: Date;
  processingMetadata: {
    processedAt: Date;
    processingVersion: string;
    validationScore: number;
    transformationsApplied: string[];
    categorization: DataCategory;
    tags: string[];
  };
}

export interface DataCategory {
  primary: string;
  secondary?: string;
  confidence: number;
  suggestedTags: string[];
}

export interface DataValidationRule {
  field: string;
  type: 'required' | 'type' | 'range' | 'format' | 'custom';
  constraint: any;
  message: string;
}

export interface DataTransformation {
  name: string;
  description: string;
  transform: (data: any) => any;
  validate?: (data: any) => boolean;
}

export interface SyncScheduleConfig {
  sourceId: string;
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
  nextRun: Date;
  lastRun?: Date;
  isActive: boolean;
  retryCount: number;
  maxRetries: number;
}

export class DataProcessingService {
  private validationRules: Map<LifeDomain, DataValidationRule[]> = new Map();
  private transformations: Map<string, DataTransformation> = new Map();
  private categoryRules: Map<LifeDomain, CategoryRule[]> = new Map();
  private dataRepository: LifeDataRepository;
  private syncScheduler: SyncScheduler;

  constructor(dataRepository: LifeDataRepository, syncScheduler: SyncScheduler) {
    this.dataRepository = dataRepository;
    this.syncScheduler = syncScheduler;
    this.initializeValidationRules();
    this.initializeTransformations();
    this.initializeCategoryRules();
  }

  /**
   * Process raw data through the complete pipeline
   */
  async processRawData(rawData: RawLifeData): Promise<ProcessedLifeData> {
    try {
      // Step 1: Validate raw data
      const validationResult = await this.validateRawData(rawData);
      if (!validationResult.isValid) {
        throw new Error(`Data validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Step 2: Apply transformations
      const transformedData = await this.applyTransformations(rawData);

      // Step 3: Categorize and tag data
      const categorization = await this.categorizeData(transformedData);

      // Step 4: Generate tags
      const tags = await this.generateTags(transformedData, categorization);

      // Step 5: Create processed life data
      const processedData: ProcessedLifeData = {
        id: uuidv4(),
        userId: rawData.userId,
        domain: rawData.domain,
        timestamp: rawData.timestamp,
        data: transformedData.data,
        source: {
          id: rawData.sourceId,
          name: rawData.metadata?.provider || 'Unknown Source',
          type: 'api',
          reliability: 0.8
        },
        confidence: this.calculateConfidence(validationResult, categorization),
        tags,
        createdAt: new Date(),
        processingMetadata: {
          processedAt: new Date(),
          processingVersion: '1.0.0',
          validationScore: validationResult.isValid ? 1.0 : 0.5,
          transformationsApplied: transformedData.transformationsApplied,
          categorization,
          tags
        }
      };

      // Step 6: Store processed data
      await this.dataRepository.store(processedData);

      return processedData;
    } catch (error) {
      throw new Error(`Data processing failed: ${error.message}`);
    }
  }

  /**
   * Validate raw data against domain-specific rules
   */
  async validateRawData(rawData: RawLifeData): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!rawData.userId) {
      errors.push('User ID is required');
    }

    if (!rawData.sourceId) {
      errors.push('Source ID is required');
    }

    if (!rawData.domain) {
      errors.push('Domain is required');
    }

    if (!rawData.timestamp) {
      errors.push('Timestamp is required');
    }

    if (!rawData.rawData) {
      errors.push('Raw data is required');
    }

    // Domain-specific validation
    const domainRules = this.validationRules.get(rawData.domain) || [];
    for (const rule of domainRules) {
      const validationError = this.validateField(rawData.rawData, rule);
      if (validationError) {
        errors.push(validationError);
      }
    }

    // Data freshness check
    const dataAge = Date.now() - rawData.timestamp.getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (dataAge > maxAge) {
      warnings.push('Data is older than 7 days');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Apply domain-specific transformations to data
   */
  async applyTransformations(rawData: RawLifeData): Promise<{
    data: any;
    transformationsApplied: string[];
  }> {
    let transformedData = { ...rawData.rawData };
    const transformationsApplied: string[] = [];

    // Apply domain-specific transformations
    const domainTransformations = this.getTransformationsForDomain(rawData.domain);
    
    for (const transformationName of domainTransformations) {
      const transformation = this.transformations.get(transformationName);
      if (transformation) {
        try {
          if (!transformation.validate || transformation.validate(transformedData)) {
            transformedData = transformation.transform(transformedData);
            transformationsApplied.push(transformationName);
          }
        } catch (error) {
          console.warn(`Transformation ${transformationName} failed:`, error.message);
        }
      }
    }

    return {
      data: transformedData,
      transformationsApplied
    };
  }

  /**
   * Categorize data based on content and domain
   */
  async categorizeData(data: { data: any; transformationsApplied: string[] }): Promise<DataCategory> {
    // This would contain more sophisticated categorization logic
    // For now, provide basic categorization based on data structure
    
    const dataKeys = Object.keys(data.data);
    let primary = 'general';
    let secondary: string | undefined;
    let confidence = 0.5;
    const suggestedTags: string[] = [];

    // Financial data categorization
    if (dataKeys.some(key => ['amount', 'transaction', 'balance', 'account'].includes(key.toLowerCase()))) {
      primary = 'financial';
      if (data.data.amount < 0) {
        secondary = 'expense';
        suggestedTags.push('expense');
      } else {
        secondary = 'income';
        suggestedTags.push('income');
      }
      confidence = 0.9;
    }

    // Health data categorization
    if (dataKeys.some(key => ['steps', 'heartrate', 'sleep', 'weight', 'calories'].includes(key.toLowerCase()))) {
      primary = 'health';
      if (dataKeys.includes('steps')) {
        secondary = 'activity';
        suggestedTags.push('fitness', 'activity');
      } else if (dataKeys.includes('sleep')) {
        secondary = 'sleep';
        suggestedTags.push('sleep', 'recovery');
      }
      confidence = 0.85;
    }

    // Calendar/event data categorization
    if (dataKeys.some(key => ['event', 'meeting', 'appointment', 'calendar'].includes(key.toLowerCase()))) {
      primary = 'calendar';
      secondary = 'event';
      suggestedTags.push('schedule', 'event');
      confidence = 0.8;
    }

    return {
      primary,
      secondary,
      confidence,
      suggestedTags
    };
  }

  /**
   * Generate tags for data based on content and categorization
   */
  async generateTags(
    data: { data: any; transformationsApplied: string[] },
    categorization: DataCategory
  ): Promise<string[]> {
    const tags = new Set<string>();

    // Add category-based tags
    tags.add(categorization.primary);
    if (categorization.secondary) {
      tags.add(categorization.secondary);
    }

    // Add suggested tags from categorization
    categorization.suggestedTags.forEach(tag => tags.add(tag));

    // Add transformation-based tags
    data.transformationsApplied.forEach(transformation => {
      tags.add(`transformed:${transformation}`);
    });

    // Add content-based tags
    const contentTags = this.extractContentTags(data.data);
    contentTags.forEach(tag => tags.add(tag));

    // Add temporal tags
    const now = new Date();
    tags.add(`year:${now.getFullYear()}`);
    tags.add(`month:${now.getMonth() + 1}`);
    tags.add(`day:${now.getDate()}`);

    return Array.from(tags);
  }

  /**
   * Schedule data synchronization
   */
  async scheduleSync(config: SyncScheduleConfig): Promise<void> {
    await this.syncScheduler.schedule(config);
  }

  /**
   * Handle sync errors and retry logic
   */
  async handleSyncError(sourceId: string, error: Error): Promise<void> {
    const config = await this.syncScheduler.getConfig(sourceId);
    if (config) {
      config.retryCount++;
      
      if (config.retryCount >= config.maxRetries) {
        config.isActive = false;
        console.error(`Sync disabled for source ${sourceId} after ${config.maxRetries} retries`);
      } else {
        // Exponential backoff
        const backoffMinutes = Math.pow(2, config.retryCount) * 5;
        config.nextRun = new Date(Date.now() + backoffMinutes * 60 * 1000);
      }
      
      await this.syncScheduler.updateConfig(config);
    }
  }

  /**
   * Get data with proper indexing for efficient queries
   */
  async getProcessedData(
    userId: string,
    filters: {
      domain?: LifeDomain;
      tags?: string[];
      dateRange?: { start: Date; end: Date };
      limit?: number;
      offset?: number;
    }
  ): Promise<ProcessedLifeData[]> {
    return this.dataRepository.query(userId, filters);
  }

  // Private helper methods

  private validateField(data: any, rule: DataValidationRule): string | null {
    const value = data[rule.field];

    switch (rule.type) {
      case 'required':
        if (value === undefined || value === null || value === '') {
          return rule.message;
        }
        break;

      case 'type':
        if (value !== undefined && typeof value !== rule.constraint) {
          return rule.message;
        }
        break;

      case 'range':
        if (typeof value === 'number') {
          const { min, max } = rule.constraint;
          if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
            return rule.message;
          }
        }
        break;

      case 'format':
        if (typeof value === 'string' && !rule.constraint.test(value)) {
          return rule.message;
        }
        break;

      case 'custom':
        if (!rule.constraint(data)) { // Pass the entire data object for custom validation
          return rule.message;
        }
        break;
    }

    return null;
  }

  private calculateConfidence(validation: ValidationResult, categorization: DataCategory): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence for valid data
    if (validation.isValid) {
      confidence += 0.3;
    }

    // Boost confidence for good categorization
    confidence += categorization.confidence * 0.2;

    // Reduce confidence for warnings
    if (validation.warnings.length > 0) {
      confidence -= validation.warnings.length * 0.1; // More significant reduction for warnings
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private getTransformationsForDomain(domain: LifeDomain): string[] {
    const transformationMap: Record<LifeDomain, string[]> = {
      financial: ['normalize-currency', 'categorize-transaction', 'detect-recurring'],
      health: ['normalize-units', 'calculate-metrics', 'detect-anomalies'],
      calendar: ['normalize-timezone', 'extract-participants', 'categorize-event'],
      emotional: ['sentiment-analysis', 'mood-scoring', 'pattern-detection'],
      social: ['extract-mentions', 'sentiment-analysis', 'relationship-mapping'],
      personal: ['normalize-timezone', 'extract-keywords', 'categorize-content', 'priority-scoring'] // Added normalize-timezone for calendar events in personal domain
    };

    return transformationMap[domain] || [];
  }

  private extractContentTags(data: any): string[] {
    const tags: string[] = [];

    // Extract tags based on data content
    if (typeof data === 'object') {
      Object.keys(data).forEach(key => {
        // Add key-based tags
        if (key.length > 2) {
          tags.push(`field:${key.toLowerCase()}`);
        }

        // Add value-based tags for specific types
        const value = data[key];
        if (typeof value === 'number') {
          if (value > 1000) tags.push('high-value');
          if (value < 0) tags.push('negative');
        }
        
        if (typeof value === 'string') {
          if (value.includes('@')) tags.push('email-related');
          if (value.includes('http')) tags.push('url-related');
        }
      });
    }

    return tags;
  }

  private initializeValidationRules(): void {
    // Financial domain rules
    this.validationRules.set('financial', [
      {
        field: 'amount',
        type: 'required',
        constraint: true,
        message: 'Amount is required for financial data'
      },
      {
        field: 'amount',
        type: 'type',
        constraint: 'number',
        message: 'Amount must be a number'
      },
      {
        field: 'currency',
        type: 'format',
        constraint: /^[A-Z]{3}$/,
        message: 'Currency must be a 3-letter ISO code'
      }
    ]);

    // Health domain rules - more flexible for different health metrics
    this.validationRules.set('health', [
      {
        field: 'steps',
        type: 'custom',
        constraint: (data: any) => {
          // At least one health metric should be present
          return data.steps !== undefined || data.heartrate !== undefined || 
                 data.sleep !== undefined || data.weight !== undefined || 
                 data.calories !== undefined || data.value !== undefined;
        },
        message: 'At least one health metric is required'
      }
    ]);
  }

  private initializeTransformations(): void {
    // Currency normalization
    this.transformations.set('normalize-currency', {
      name: 'normalize-currency',
      description: 'Convert currency amounts to base currency',
      transform: (data) => {
        if (data.amount && data.currency && data.currency !== 'USD') {
          // In a real implementation, this would use exchange rates
          data.originalAmount = data.amount;
          data.originalCurrency = data.currency;
          data.currency = 'USD';
          // Mock conversion rate
          data.amount = data.amount * 1.1;
        }
        return data;
      },
      validate: (data) => data.amount !== undefined && data.currency !== undefined
    });

    // Unit normalization for health data
    this.transformations.set('normalize-units', {
      name: 'normalize-units',
      description: 'Convert health metrics to standard units',
      transform: (data) => {
        if (data.weight && data.unit === 'lbs') {
          data.originalWeight = data.weight;
          data.originalUnit = data.unit;
          data.weight = data.weight * 0.453592; // Convert to kg
          data.unit = 'kg';
        }
        return data;
      },
      validate: (data) => data.weight !== undefined && data.unit !== undefined
    });

    // Timezone normalization
    this.transformations.set('normalize-timezone', {
      name: 'normalize-timezone',
      description: 'Convert timestamps to UTC',
      transform: (data) => {
        if (data.startTime && typeof data.startTime === 'string') {
          data.originalStartTime = data.startTime;
          data.startTime = new Date(data.startTime).toISOString();
        }
        if (data.endTime && typeof data.endTime === 'string') {
          data.originalEndTime = data.endTime;
          data.endTime = new Date(data.endTime).toISOString();
        }
        return data;
      }
    });
  }

  private initializeCategoryRules(): void {
    // This would contain more sophisticated categorization rules
    // For now, basic rules are implemented in the categorizeData method
  }
}

// Repository interface for life data storage
export interface LifeDataRepository {
  store(data: ProcessedLifeData): Promise<void>;
  query(
    userId: string,
    filters: {
      domain?: LifeDomain;
      tags?: string[];
      dateRange?: { start: Date; end: Date };
      limit?: number;
      offset?: number;
    }
  ): Promise<ProcessedLifeData[]>;
  update(id: string, data: Partial<ProcessedLifeData>): Promise<void>;
  delete(id: string): Promise<void>;
}

// Sync scheduler interface
export interface SyncScheduler {
  schedule(config: SyncScheduleConfig): Promise<void>;
  getConfig(sourceId: string): Promise<SyncScheduleConfig | null>;
  updateConfig(config: SyncScheduleConfig): Promise<void>;
  getActiveConfigs(): Promise<SyncScheduleConfig[]>;
  executeScheduledSyncs(): Promise<void>;
}

// Category rule interface
interface CategoryRule {
  condition: (data: any) => boolean;
  category: {
    primary: string;
    secondary?: string;
    confidence: number;
    tags: string[];
  };
}