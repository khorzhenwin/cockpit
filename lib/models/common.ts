// Common types and enums used across the system

export type LifeDomain = 'financial' | 'career' | 'health' | 'emotional' | 'social' | 'personal';

export type InsightType = 'pattern' | 'anomaly' | 'opportunity' | 'warning' | 'recommendation';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type ImpactLevel = 'minimal' | 'moderate' | 'significant' | 'major';

export type EffortLevel = 'minimal' | 'low' | 'moderate' | 'high' | 'extensive';

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface Correlation {
  domain1: LifeDomain;
  domain2: LifeDomain;
  strength: number; // -1 to 1
  confidence: number; // 0 to 1
  description: string;
}

export interface DomainImpact {
  domain: LifeDomain;
  impact: ImpactLevel;
  description: string;
}

export interface EncryptedCredentials {
  encryptedData: string;
  keyId: string;
  algorithm: string;
}

export interface SyncSchedule {
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
  timeOfDay?: string; // HH:MM format
  daysOfWeek?: number[]; // 0-6, Sunday = 0
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConnectionResult {
  success: boolean;
  connectionId?: string;
  error?: string;
  capabilities: string[];
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsUpdated: number;
  recordsCreated: number;
  errors: string[];
  lastSyncTime: Date;
}

export interface DataSourceConfig {
  type: 'financial' | 'calendar' | 'health' | 'social' | 'manual';
  credentials: EncryptedCredentials;
  syncFrequency: SyncSchedule;
  dataTypes: string[];
}