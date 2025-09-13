// Insights and recommendations data models

import { LifeDomain, InsightType, Priority, ImpactLevel, EffortLevel, DomainImpact } from './common';
import { LifeData } from './lifeData';

export interface Insight {
  id: string;
  userId: string;
  type: InsightType;
  title: string;
  description: string;
  impact: ImpactLevel;
  confidence: number; // 0-1
  supportingData: LifeData[];
  generatedAt: Date;
  expiresAt?: Date;
  domain: LifeDomain;
  crossDomainEffects?: DomainImpact[];
  tags: string[];
  metadata?: Record<string, any>;
}

export interface Recommendation {
  id: string;
  insightId: string;
  action: string;
  reasoning: string;
  priority: Priority;
  estimatedEffort: EffortLevel;
  expectedOutcome: string;
  crossDomainImpacts: DomainImpact[];
  timeline?: Timeline;
  prerequisites?: string[];
  risks?: Risk[];
  alternatives?: Alternative[];
  metrics?: SuccessMetric[];
}

export interface Timeline {
  estimatedDuration: number; // days
  milestones: TimelineMilestone[];
  dependencies: string[];
}

export interface TimelineMilestone {
  title: string;
  description: string;
  targetDate: Date;
  completed: boolean;
  completedDate?: Date;
}

export interface Risk {
  description: string;
  probability: number; // 0-1
  impact: ImpactLevel;
  mitigation: string;
}

export interface Alternative {
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  effort: EffortLevel;
  expectedOutcome: string;
}

export interface SuccessMetric {
  name: string;
  description: string;
  targetValue: number;
  currentValue?: number;
  unit: string;
  measurementFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

// Pattern Analysis Models
export interface LifePatterns {
  financial: FinancialPatterns;
  emotional: EmotionalPatterns;
  career: CareerPatterns;
  health: HealthPatterns;
  relationships: RelationshipPatterns;
  crossDomainCorrelations: CrossDomainCorrelation[];
}

export interface PatternBase {
  domain: LifeDomain;
  timeframe: {
    start: Date;
    end: Date;
  };
  confidence: number;
  significance: number;
  trends: Trend[];
  anomalies: Anomaly[];
}

export interface FinancialPatterns extends PatternBase {
  spendingPatterns: SpendingPattern[];
  incomePatterns: IncomePattern[];
  investmentPatterns: InvestmentPattern[];
  savingsPatterns: SavingsPattern[];
}

export interface SpendingPattern {
  category: string;
  averageAmount: number;
  frequency: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality?: SeasonalityInfo;
  triggers?: string[];
}

export interface IncomePattern {
  source: string;
  amount: number;
  frequency: string;
  stability: number; // 0-1
  growth: number; // percentage
}

export interface InvestmentPattern {
  assetClass: string;
  allocation: number; // percentage
  performance: number; // percentage return
  riskLevel: number; // 1-10
  rebalancingFrequency: string;
}

export interface SavingsPattern {
  rate: number; // percentage of income
  consistency: number; // 0-1
  goals: string[];
  triggers: string[];
}

export interface EmotionalPatterns extends PatternBase {
  moodPatterns: MoodPattern[];
  stressPatterns: StressPattern[];
  relationshipPatterns: RelationshipPattern[];
  copingPatterns: CopingPattern[];
}

export interface MoodPattern {
  averageMood: number;
  volatility: number;
  triggers: string[];
  timeOfDayEffects: TimeOfDayEffect[];
  seasonalEffects?: SeasonalityInfo;
}

export interface StressPattern {
  averageLevel: number;
  sources: StressSource[];
  physicalManifestations: string[];
  copingEffectiveness: number;
}

export interface StressSource {
  category: string;
  frequency: number;
  impact: number;
  controllability: number; // 0-1
}

export interface RelationshipPattern {
  type: string;
  quality: number; // 1-10
  stability: number; // 0-1
  communicationFrequency: string;
  conflictFrequency: number;
  resolutionEffectiveness: number;
}

export interface CopingPattern {
  strategy: string;
  frequency: number;
  effectiveness: number; // 1-10
  situations: string[];
  outcomes: string[];
}

export interface CareerPatterns extends PatternBase {
  skillDevelopment: SkillDevelopmentPattern[];
  performancePatterns: PerformancePattern[];
  networkingPatterns: NetworkingPattern[];
  satisfactionPatterns: SatisfactionPattern[];
}

export interface SkillDevelopmentPattern {
  skill: string;
  growthRate: number;
  learningMethods: string[];
  applicationFrequency: number;
  marketDemand: number;
}

export interface PerformancePattern {
  metric: string;
  trend: 'improving' | 'declining' | 'stable';
  factors: string[];
  seasonality?: SeasonalityInfo;
}

export interface NetworkingPattern {
  frequency: number;
  effectiveness: number;
  preferredChannels: string[];
  outcomes: string[];
}

export interface SatisfactionPattern {
  overallSatisfaction: number;
  factors: SatisfactionFactor[];
  changeDrivers: string[];
}

export interface SatisfactionFactor {
  factor: string;
  importance: number;
  currentLevel: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface HealthPatterns extends PatternBase {
  activityPatterns: ActivityPattern[];
  sleepPatterns: SleepPattern[];
  nutritionPatterns: NutritionPattern[];
  vitalPatterns: VitalPattern[];
}

export interface ActivityPattern {
  type: string;
  frequency: number;
  duration: number;
  intensity: string;
  consistency: number;
  outcomes: string[];
}

export interface SleepPattern {
  averageDuration: number;
  averageQuality: number;
  bedtimeConsistency: number;
  factors: SleepFactor[];
}

export interface SleepFactor {
  factor: string;
  impact: number; // -5 to 5
  frequency: number;
}

export interface NutritionPattern {
  averageCalories: number;
  macroBalance: {
    protein: number;
    carbs: number;
    fat: number;
  };
  mealTiming: string[];
  qualityScore: number;
}

export interface VitalPattern {
  metric: string;
  averageValue: number;
  trend: 'improving' | 'declining' | 'stable';
  variability: number;
  normalRange: {
    min: number;
    max: number;
  };
}

export interface RelationshipPatterns extends PatternBase {
  socialConnections: SocialConnectionPattern[];
  communicationPatterns: CommunicationPattern[];
  conflictPatterns: ConflictPattern[];
  supportPatterns: SupportPattern[];
}

export interface SocialConnectionPattern {
  type: string;
  frequency: number;
  quality: number;
  reciprocity: number;
  growth: number;
}

export interface CommunicationPattern {
  channel: string;
  frequency: number;
  effectiveness: number;
  sentiment: number;
}

export interface ConflictPattern {
  frequency: number;
  sources: string[];
  resolutionMethods: string[];
  outcomes: string[];
  learnings: string[];
}

export interface SupportPattern {
  given: SupportMetric;
  received: SupportMetric;
  balance: number; // -1 to 1
}

export interface SupportMetric {
  frequency: number;
  types: string[];
  effectiveness: number;
  reciprocity: number;
}

// Cross-domain correlation models
export interface CrossDomainCorrelation {
  domain1: LifeDomain;
  domain2: LifeDomain;
  strength: number; // -1 to 1
  confidence: number; // 0-1
  description: string;
  examples: CorrelationExample[];
  implications: string[];
}

export interface CorrelationExample {
  description: string;
  strength: number;
  timeframe: string;
  evidence: string[];
}

// Common pattern elements
export interface Trend {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable' | 'cyclical';
  strength: number; // 0-1
  duration: number; // days
  confidence: number; // 0-1
}

export interface Anomaly {
  timestamp: Date;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  significance: number; // 0-1
  possibleCauses: string[];
}

export interface SeasonalityInfo {
  pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
  strength: number; // 0-1
  peaks: string[];
  troughs: string[];
}

export interface TimeOfDayEffect {
  timeRange: string; // e.g., "06:00-12:00"
  effect: number; // -5 to 5
  consistency: number; // 0-1
}