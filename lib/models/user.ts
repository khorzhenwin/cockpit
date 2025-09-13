// User-related data models

export interface User {
  id: string;
  profile: UserProfile;
  preferences: UserPreferences;
  privacySettings: PrivacySettings;
  connectedSources: DataSource[];
  createdAt: Date;
  lastActive: Date;
}

export interface UserProfile {
  demographics: Demographics;
  goals: LifeGoal[];
  values: PersonalValue[];
  riskTolerance: RiskProfile;
  communicationStyle: CommunicationPreferences;
}

export interface Demographics {
  age?: number;
  location?: string;
  occupation?: string;
  incomeRange?: string;
  familyStatus?: string;
}

export interface LifeGoal {
  id: string;
  domain: string;
  title: string;
  description: string;
  targetDate?: Date;
  priority: 'low' | 'medium' | 'high';
  progress: number; // 0-100
  metrics: GoalMetric[];
}

export interface GoalMetric {
  name: string;
  currentValue: number;
  targetValue: number;
  unit: string;
}

export interface PersonalValue {
  name: string;
  importance: number; // 1-10
  description?: string;
}

export interface RiskProfile {
  financial: 'conservative' | 'moderate' | 'aggressive';
  career: 'stable' | 'balanced' | 'ambitious';
  personal: 'cautious' | 'moderate' | 'adventurous';
}

export interface CommunicationPreferences {
  style: 'formal' | 'casual' | 'friendly';
  detail: 'brief' | 'moderate' | 'comprehensive';
  frequency: 'minimal' | 'regular' | 'frequent';
  channels: ('push' | 'email' | 'sms' | 'in-app')[];
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  privacy: PrivacyLevel;
  dataRetention: DataRetentionSettings;
  ui: UIPreferences;
}

export interface NotificationPreferences {
  insights: boolean;
  alerts: boolean;
  recommendations: boolean;
  reminders: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM
  };
}

export type PrivacyLevel = 'minimal' | 'balanced' | 'maximum';

export interface DataRetentionSettings {
  keepHistoryMonths: number;
  autoDeleteSensitive: boolean;
  exportBeforeDelete: boolean;
}

export interface UIPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dashboardLayout: string;
}

export interface PrivacySettings {
  dataSharing: DataSharingSettings;
  visibility: VisibilitySettings;
  consent: ConsentSettings;
}

export interface DataSharingSettings {
  allowAnalytics: boolean;
  allowImprovement: boolean;
  allowResearch: boolean;
  thirdPartyIntegrations: boolean;
}

export interface VisibilitySettings {
  profileVisibility: 'private' | 'limited' | 'public';
  dataVisibility: Record<string, boolean>;
  insightSharing: boolean;
}

export interface ConsentSettings {
  dataCollection: Record<string, boolean>;
  processing: Record<string, boolean>;
  storage: Record<string, boolean>;
  lastUpdated: Date;
}

export interface DataSource {
  id: string;
  type: 'financial' | 'calendar' | 'health' | 'social' | 'manual';
  name: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  credentials: any; // Encrypted credentials
  syncFrequency: string;
  dataTypes: string[];
  lastSync?: Date;
  nextSync?: Date;
  errorMessage?: string;
}