// Life data models for different domains

import { LifeDomain } from './common';

export interface LifeData {
  userId: string;
  domain: LifeDomain;
  timestamp: Date;
  data: DomainSpecificData;
  source: DataSource;
  confidence: number; // 0-1
  tags: string[];
  metadata?: Record<string, any>;
}

export interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'manual' | 'import' | 'calculated';
  reliability: number; // 0-1
}

export interface DomainSpecificData {
  type: string;
  [key: string]: any;
}

// Financial Data Models
export interface FinancialData extends DomainSpecificData {
  accounts: Account[];
  transactions: Transaction[];
  investments: Investment[];
  goals: FinancialGoal[];
}

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'loan';
  balance: number;
  currency: string;
  institution: string;
  lastUpdated: Date;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  date: Date;
  type: 'debit' | 'credit';
  merchant?: string;
  location?: string;
}

export interface Investment {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  currentPrice: number;
  purchasePrice: number;
  purchaseDate: Date;
  currency: string;
  type: 'stock' | 'bond' | 'etf' | 'mutual_fund' | 'crypto' | 'other';
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  priority: 'low' | 'medium' | 'high';
  category: 'emergency' | 'retirement' | 'purchase' | 'debt' | 'other';
}

// Emotional Data Models
export interface EmotionalData extends DomainSpecificData {
  moodEntries: MoodEntry[];
  stressLevels: StressMetric[];
  relationshipEvents: RelationshipEvent[];
  lifeEvents: LifeEvent[];
}

export interface MoodEntry {
  id: string;
  timestamp: Date;
  mood: number; // 1-10 scale
  energy: number; // 1-10 scale
  emotions: string[];
  notes?: string;
  triggers?: string[];
  context?: string;
}

export interface StressMetric {
  id: string;
  timestamp: Date;
  level: number; // 1-10 scale
  sources: string[];
  physicalSymptoms: string[];
  copingStrategies: string[];
  effectiveness?: number; // 1-10 scale
}

export interface RelationshipEvent {
  id: string;
  timestamp: Date;
  type: 'conflict' | 'positive' | 'milestone' | 'change';
  relationship: string;
  description: string;
  impact: number; // -5 to 5 scale
  resolution?: string;
}

export interface LifeEvent {
  id: string;
  timestamp: Date;
  category: 'career' | 'family' | 'health' | 'financial' | 'personal';
  title: string;
  description: string;
  impact: number; // -5 to 5 scale
  significance: 'minor' | 'moderate' | 'major' | 'life-changing';
}

// Career Data Models
export interface CareerData extends DomainSpecificData {
  positions: Position[];
  skills: Skill[];
  achievements: Achievement[];
  goals: CareerGoal[];
  networkContacts: NetworkContact[];
}

export interface Position {
  id: string;
  title: string;
  company: string;
  startDate: Date;
  endDate?: Date;
  isCurrent: boolean;
  salary?: number;
  currency?: string;
  responsibilities: string[];
  skills: string[];
  achievements: string[];
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  proficiency: number; // 1-10 scale
  yearsExperience: number;
  lastUsed: Date;
  certifications: string[];
  endorsements: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: Date;
  category: string;
  impact: string;
  recognition?: string;
}

export interface CareerGoal {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  priority: 'low' | 'medium' | 'high';
  progress: number; // 0-100
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  targetDate: Date;
  completed: boolean;
  completedDate?: Date;
}

export interface NetworkContact {
  id: string;
  name: string;
  title?: string;
  company?: string;
  relationship: string;
  lastContact: Date;
  contactFrequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'rare';
  strength: number; // 1-10 scale
  notes?: string;
}

// Health Data Models
export interface HealthData extends DomainSpecificData {
  vitals: VitalSign[];
  activities: Activity[];
  sleep: SleepRecord[];
  nutrition: NutritionEntry[];
  symptoms: Symptom[];
}

export interface VitalSign {
  id: string;
  timestamp: Date;
  type: 'heart_rate' | 'blood_pressure' | 'weight' | 'temperature' | 'other';
  value: number;
  unit: string;
  context?: string;
}

export interface Activity {
  id: string;
  timestamp: Date;
  type: string;
  duration: number; // minutes
  intensity: 'low' | 'moderate' | 'high';
  calories?: number;
  distance?: number;
  notes?: string;
}

export interface SleepRecord {
  id: string;
  date: Date;
  bedtime: Date;
  wakeTime: Date;
  duration: number; // minutes
  quality: number; // 1-10 scale
  stages?: SleepStage[];
  notes?: string;
}

export interface SleepStage {
  stage: 'awake' | 'light' | 'deep' | 'rem';
  duration: number; // minutes
  percentage: number;
}

export interface NutritionEntry {
  id: string;
  timestamp: Date;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: FoodItem[];
  totalCalories: number;
  macros: Macronutrients;
}

export interface FoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
}

export interface Macronutrients {
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  fiber?: number; // grams
}

export interface Symptom {
  id: string;
  timestamp: Date;
  type: string;
  severity: number; // 1-10 scale
  duration: number; // minutes
  triggers?: string[];
  treatments?: string[];
  notes?: string;
}