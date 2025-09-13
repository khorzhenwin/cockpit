// AI Advisory service for pattern analysis and recommendation generation

import { LifeData } from '../models/lifeData';
import { UserProfile } from '../models/user';
import { LifeDomain, Priority, ImpactLevel } from '../models/common';
import { MCPClient, AIResponse, ProactiveInsight, AdviceResponse } from './mcpClient';

// Pattern analysis interfaces
export interface DomainPattern {
  id: string;
  domain: LifeDomain;
  type: PatternType;
  description: string;
  confidence: number;
  strength: number; // 0-1, how strong the pattern is
  frequency: number; // how often this pattern occurs
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  timeframe: {
    start: Date;
    end: Date;
  };
  supportingData: LifeData[];
  metadata?: Record<string, any>;
}

export type PatternType = 
  | 'spending_trend' 
  | 'mood_cycle' 
  | 'productivity_pattern' 
  | 'health_correlation' 
  | 'career_progression' 
  | 'relationship_dynamic' 
  | 'sleep_pattern' 
  | 'stress_trigger' 
  | 'goal_progress' 
  | 'habit_formation';

export interface InsightGeneration {
  id: string;
  title: string;
  description: string;
  type: 'opportunity' | 'warning' | 'pattern' | 'anomaly' | 'recommendation';
  priority: Priority;
  confidence: number;
  reasoning: string;
  domain: LifeDomain;
  relatedPatterns: string[]; // Pattern IDs
  actionable: boolean;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface RecommendationSystem {
  id: string;
  title: string;
  description: string;
  category: RecommendationCategory;
  priority: Priority;
  confidence: number;
  reasoning: string;
  expectedImpact: ImpactLevel;
  effort: 'minimal' | 'low' | 'moderate' | 'high' | 'extensive';
  timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  prerequisites: string[];
  steps: RecommendationStep[];
  risks: string[];
  alternatives: string[];
  successMetrics: string[];
  relatedDomains: LifeDomain[];
}

export type RecommendationCategory = 
  | 'financial_optimization' 
  | 'career_advancement' 
  | 'health_improvement' 
  | 'relationship_enhancement' 
  | 'productivity_boost' 
  | 'stress_reduction' 
  | 'goal_achievement' 
  | 'habit_change' 
  | 'life_balance';

export interface RecommendationStep {
  order: number;
  description: string;
  estimatedTime: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
  resources?: string[];
}

export interface ConversationHistory {
  sessionId: string;
  userId: string;
  messages: ConversationMessage[];
  context: ConversationContext;
  insights: InsightGeneration[];
  recommendations: RecommendationSystem[];
  createdAt: Date;
  lastUpdated: Date;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  confidence?: number;
  reasoning?: string;
  relatedInsights?: string[];
  relatedRecommendations?: string[];
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  currentTopic?: string;
  activeDomains: LifeDomain[];
  userIntent: UserIntent;
  conversationState: ConversationState;
  lastActivity: Date;
  preferences: ConversationPreferences;
}

export type UserIntent = 
  | 'seeking_advice' 
  | 'exploring_patterns' 
  | 'goal_planning' 
  | 'problem_solving' 
  | 'general_inquiry' 
  | 'status_check' 
  | 'clarification';

export type ConversationState = 
  | 'greeting' 
  | 'information_gathering' 
  | 'analysis' 
  | 'recommendation' 
  | 'clarification' 
  | 'follow_up' 
  | 'closing';

export interface ConversationPreferences {
  detailLevel: 'brief' | 'moderate' | 'comprehensive';
  communicationStyle: 'formal' | 'casual' | 'friendly';
  focusAreas: LifeDomain[];
  avoidTopics: string[];
}

// Main AI Advisory Service
export class AIAdvisoryService {
  private mcpClient: MCPClient;
  private conversationHistories: Map<string, ConversationHistory>;
  private patternCache: Map<string, DomainPattern[]>;
  private insightCache: Map<string, InsightGeneration[]>;

  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;
    this.conversationHistories = new Map();
    this.patternCache = new Map();
    this.insightCache = new Map();
  }

  // Pattern Analysis Functions
  async analyzePatterns(userId: string, data: LifeData[], domain?: LifeDomain): Promise<DomainPattern[]> {
    const cacheKey = `${userId}_${domain || 'all'}_${Date.now()}`;
    
    try {
      // Filter data by domain if specified
      const filteredData = domain ? data.filter(d => d.domain === domain) : data;
      
      if (filteredData.length === 0) {
        return [];
      }

      // Group data by domain for analysis
      const domainGroups = this.groupDataByDomain(filteredData);
      const patterns: DomainPattern[] = [];

      for (const [domainKey, domainData] of domainGroups.entries()) {
        const domainPatterns = await this.analyzeDomainPatterns(domainKey, domainData);
        patterns.push(...domainPatterns);
      }

      // Cache the results
      this.patternCache.set(cacheKey, patterns);
      
      return patterns;
    } catch (error) {
      console.error('Error analyzing patterns:', error);
      return [];
    }
  }

  async generateInsights(userId: string, patterns: DomainPattern[], userProfile: UserProfile): Promise<InsightGeneration[]> {
    const cacheKey = `insights_${userId}_${Date.now()}`;
    
    try {
      const insights: InsightGeneration[] = [];

      // Generate insights from patterns
      for (const pattern of patterns) {
        const patternInsights = await this.generatePatternInsights(pattern, userProfile);
        insights.push(...patternInsights);
      }

      // Get proactive insights from MCP
      const proactiveInsights = await this.mcpClient.getProactiveInsights(userProfile);
      const convertedInsights = this.convertProactiveInsights(proactiveInsights);
      insights.push(...convertedInsights);

      // Sort by priority and confidence
      insights.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidence - a.confidence;
      });

      // Cache the results
      this.insightCache.set(cacheKey, insights);
      
      return insights;
    } catch (error) {
      console.error('Error generating insights:', error);
      return [];
    }
  }

  async generateRecommendations(
    userId: string, 
    insights: InsightGeneration[], 
    userProfile: UserProfile
  ): Promise<RecommendationSystem[]> {
    try {
      const recommendations: RecommendationSystem[] = [];

      for (const insight of insights) {
        if (insight.actionable) {
          const insightRecommendations = await this.generateInsightRecommendations(insight, userProfile);
          recommendations.push(...insightRecommendations);
        }
      }

      // Sort by priority and expected impact
      recommendations.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const impactOrder = { major: 4, significant: 3, moderate: 2, minimal: 1 };
        
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        return impactOrder[b.expectedImpact] - impactOrder[a.expectedImpact];
      });

      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  // Conversation History Management
  createConversationHistory(userId: string, preferences?: ConversationPreferences): ConversationHistory {
    const sessionId = this.generateId();
    const history: ConversationHistory = {
      sessionId,
      userId,
      messages: [],
      context: {
        activeDomains: [],
        userIntent: 'general_inquiry',
        conversationState: 'greeting',
        lastActivity: new Date(),
        preferences: preferences || {
          detailLevel: 'moderate',
          communicationStyle: 'friendly',
          focusAreas: [],
          avoidTopics: [],
        },
      },
      insights: [],
      recommendations: [],
      createdAt: new Date(),
      lastUpdated: new Date(),
    };

    this.conversationHistories.set(sessionId, history);
    return history;
  }

  updateConversationHistory(sessionId: string, message: ConversationMessage): ConversationHistory | null {
    const history = this.conversationHistories.get(sessionId);
    if (!history) return null;

    history.messages.push(message);
    history.context.lastActivity = new Date();
    history.lastUpdated = new Date();

    // Update conversation state and user intent based on message
    this.updateConversationContext(history, message);

    this.conversationHistories.set(sessionId, history);
    return history;
  }

  getConversationHistory(sessionId: string): ConversationHistory | null {
    return this.conversationHistories.get(sessionId) || null;
  }

  clearConversationHistory(sessionId: string): void {
    this.conversationHistories.delete(sessionId);
  }

  // Confidence Scoring and Reasoning
  calculateConfidenceScore(
    dataQuality: number,
    patternStrength: number,
    historicalAccuracy: number,
    domainExpertise: number
  ): number {
    // Weighted average of different confidence factors
    const weights = {
      dataQuality: 0.3,
      patternStrength: 0.25,
      historicalAccuracy: 0.25,
      domainExpertise: 0.2,
    };

    return (
      dataQuality * weights.dataQuality +
      patternStrength * weights.patternStrength +
      historicalAccuracy * weights.historicalAccuracy +
      domainExpertise * weights.domainExpertise
    );
  }

  generateReasoning(
    pattern: DomainPattern,
    insight: InsightGeneration,
    userContext: any
  ): string {
    const reasoningParts = [];

    // Pattern-based reasoning
    reasoningParts.push(`Based on analysis of ${pattern.supportingData.length} data points`);
    reasoningParts.push(`showing a ${pattern.trend} trend in ${pattern.domain}`);

    // Confidence reasoning
    if (pattern.confidence >= 0.8) {
      reasoningParts.push('with high confidence due to consistent patterns');
    } else if (pattern.confidence > 0.6) {
      reasoningParts.push('with moderate confidence based on available data');
    } else {
      reasoningParts.push('with limited confidence due to insufficient data');
    }

    // Context-specific reasoning
    if (userContext.goals) {
      reasoningParts.push('considering your stated goals and preferences');
    }

    return reasoningParts.join(', ') + '.';
  }

  // Private helper methods
  private groupDataByDomain(data: LifeData[]): Map<LifeDomain, LifeData[]> {
    const groups = new Map<LifeDomain, LifeData[]>();
    
    for (const item of data) {
      if (!groups.has(item.domain)) {
        groups.set(item.domain, []);
      }
      groups.get(item.domain)!.push(item);
    }
    
    return groups;
  }

  private async analyzeDomainPatterns(domain: LifeDomain, data: LifeData[]): Promise<DomainPattern[]> {
    const patterns: DomainPattern[] = [];

    // Simple pattern detection based on domain
    switch (domain) {
      case 'financial':
        patterns.push(...this.analyzeFinancialPatterns(data));
        break;
      case 'emotional':
        patterns.push(...this.analyzeEmotionalPatterns(data));
        break;
      case 'career':
        patterns.push(...this.analyzeCareerPatterns(data));
        break;
      case 'health':
        patterns.push(...this.analyzeHealthPatterns(data));
        break;
      default:
        patterns.push(...this.analyzeGenericPatterns(domain, data));
    }

    return patterns;
  }

  private analyzeFinancialPatterns(data: LifeData[]): DomainPattern[] {
    const patterns: DomainPattern[] = [];
    
    // Simple spending trend analysis
    if (data.length >= 3) {
      const amounts = data.map(d => d.data.amount || 0).filter(a => a > 0);
      if (amounts.length >= 3) {
        const trend = this.calculateTrend(amounts);
        patterns.push({
          id: this.generateId(),
          domain: 'financial',
          type: 'spending_trend',
          description: `Spending shows ${trend} pattern over recent period`,
          confidence: 0.7,
          strength: 0.6,
          frequency: amounts.length,
          trend,
          timeframe: {
            start: new Date(Math.min(...data.map(d => d.timestamp.getTime()))),
            end: new Date(Math.max(...data.map(d => d.timestamp.getTime()))),
          },
          supportingData: data,
        });
      }
    }

    return patterns;
  }

  private analyzeEmotionalPatterns(data: LifeData[]): DomainPattern[] {
    const patterns: DomainPattern[] = [];
    
    // Simple mood cycle analysis - reduced threshold for testing
    if (data.length >= 3) {
      const moodScores = data.map(d => d.data.mood || 5).filter(m => m > 0);
      if (moodScores.length >= 3) {
        const avgMood = moodScores.reduce((a, b) => a + b, 0) / moodScores.length;
        const variance = moodScores.reduce((acc, mood) => acc + Math.pow(mood - avgMood, 2), 0) / moodScores.length;
        
        patterns.push({
          id: this.generateId(),
          domain: 'emotional',
          type: 'mood_cycle',
          description: `Mood patterns show ${variance > 2 ? 'high' : 'low'} variability with average of ${avgMood.toFixed(1)}`,
          confidence: 0.6,
          strength: Math.min(variance / 4, 1),
          frequency: moodScores.length,
          trend: this.calculateTrend(moodScores),
          timeframe: {
            start: new Date(Math.min(...data.map(d => d.timestamp.getTime()))),
            end: new Date(Math.max(...data.map(d => d.timestamp.getTime()))),
          },
          supportingData: data,
        });
      }
    }

    return patterns;
  }

  private analyzeCareerPatterns(data: LifeData[]): DomainPattern[] {
    const patterns: DomainPattern[] = [];
    
    // Simple career progression analysis
    if (data.length >= 2) {
      patterns.push({
        id: this.generateId(),
        domain: 'career',
        type: 'career_progression',
        description: `Career activity shows ${data.length} significant events`,
        confidence: 0.5,
        strength: 0.4,
        frequency: data.length,
        trend: 'stable',
        timeframe: {
          start: new Date(Math.min(...data.map(d => d.timestamp.getTime()))),
          end: new Date(Math.max(...data.map(d => d.timestamp.getTime()))),
        },
        supportingData: data,
      });
    }

    return patterns;
  }

  private analyzeHealthPatterns(data: LifeData[]): DomainPattern[] {
    const patterns: DomainPattern[] = [];
    
    // Simple health correlation analysis
    if (data.length >= 3) {
      patterns.push({
        id: this.generateId(),
        domain: 'health',
        type: 'health_correlation',
        description: `Health data shows patterns across ${data.length} measurements`,
        confidence: 0.6,
        strength: 0.5,
        frequency: data.length,
        trend: 'stable',
        timeframe: {
          start: new Date(Math.min(...data.map(d => d.timestamp.getTime()))),
          end: new Date(Math.max(...data.map(d => d.timestamp.getTime()))),
        },
        supportingData: data,
      });
    }

    return patterns;
  }

  private analyzeGenericPatterns(domain: LifeDomain, data: LifeData[]): DomainPattern[] {
    const patterns: DomainPattern[] = [];
    
    if (data.length >= 2) {
      patterns.push({
        id: this.generateId(),
        domain,
        type: 'productivity_pattern',
        description: `${domain} domain shows activity patterns`,
        confidence: 0.4,
        strength: 0.3,
        frequency: data.length,
        trend: 'stable',
        timeframe: {
          start: new Date(Math.min(...data.map(d => d.timestamp.getTime()))),
          end: new Date(Math.max(...data.map(d => d.timestamp.getTime()))),
        },
        supportingData: data,
      });
    }

    return patterns;
  }

  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' | 'volatile' {
    if (values.length < 2) return 'stable';
    
    const changes = [];
    for (let i = 1; i < values.length; i++) {
      changes.push(values[i] - values[i - 1]);
    }
    
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    const variance = changes.reduce((acc, change) => acc + Math.pow(change - avgChange, 2), 0) / changes.length;
    
    if (variance > Math.abs(avgChange) * 2) return 'volatile';
    if (avgChange > 0.1) return 'increasing';
    if (avgChange < -0.1) return 'decreasing';
    return 'stable';
  }

  private async generatePatternInsights(pattern: DomainPattern, userProfile: UserProfile): Promise<InsightGeneration[]> {
    const insights: InsightGeneration[] = [];
    
    // Generate basic insight from pattern
    insights.push({
      id: this.generateId(),
      title: `${pattern.domain} Pattern Detected`,
      description: pattern.description,
      type: 'pattern',
      priority: pattern.confidence > 0.7 ? 'medium' : 'low',
      confidence: pattern.confidence,
      reasoning: this.generateReasoning(pattern, {} as InsightGeneration, userProfile),
      domain: pattern.domain,
      relatedPatterns: [pattern.id],
      actionable: pattern.confidence > 0.6,
    });

    return insights;
  }

  private convertProactiveInsights(proactiveInsights: ProactiveInsight[]): InsightGeneration[] {
    return proactiveInsights.map(insight => ({
      id: insight.id,
      title: insight.title,
      description: insight.description,
      type: 'opportunity' as const,
      priority: insight.priority,
      confidence: 0.8, // Default confidence for MCP insights
      reasoning: 'Generated by AI analysis of your life patterns',
      domain: insight.domain,
      relatedPatterns: [],
      actionable: insight.actionRequired,
      expiresAt: insight.expiresAt,
      metadata: insight.metadata,
    }));
  }

  private async generateInsightRecommendations(
    insight: InsightGeneration, 
    userProfile: UserProfile
  ): Promise<RecommendationSystem[]> {
    const recommendations: RecommendationSystem[] = [];
    
    // Generate basic recommendation based on insight
    recommendations.push({
      id: this.generateId(),
      title: `Action for ${insight.title}`,
      description: `Recommended actions based on ${insight.description}`,
      category: this.mapDomainToCategory(insight.domain),
      priority: insight.priority,
      confidence: insight.confidence,
      reasoning: insight.reasoning,
      expectedImpact: insight.priority === 'high' ? 'significant' : 'moderate',
      effort: 'moderate',
      timeframe: 'short_term',
      prerequisites: [],
      steps: [
        {
          order: 1,
          description: 'Review the identified pattern',
          estimatedTime: '15 minutes',
          difficulty: 'easy',
        },
        {
          order: 2,
          description: 'Create an action plan',
          estimatedTime: '30 minutes',
          difficulty: 'moderate',
        },
      ],
      risks: ['May require behavior change'],
      alternatives: ['Monitor pattern for longer period'],
      successMetrics: ['Improved pattern metrics'],
      relatedDomains: [insight.domain],
    });

    return recommendations;
  }

  private mapDomainToCategory(domain: LifeDomain): RecommendationCategory {
    const mapping: Record<LifeDomain, RecommendationCategory> = {
      financial: 'financial_optimization',
      career: 'career_advancement',
      health: 'health_improvement',
      emotional: 'stress_reduction',
      social: 'relationship_enhancement',
      personal: 'life_balance',
    };
    
    return mapping[domain] || 'life_balance';
  }

  private updateConversationContext(history: ConversationHistory, message: ConversationMessage): void {
    // Simple context updates based on message content
    const content = message.content.toLowerCase();
    
    // Update user intent
    if (content.includes('advice') || content.includes('recommend')) {
      history.context.userIntent = 'seeking_advice';
    } else if (content.includes('pattern') || content.includes('trend')) {
      history.context.userIntent = 'exploring_patterns';
    } else if (content.includes('goal') || content.includes('plan')) {
      history.context.userIntent = 'goal_planning';
    }

    // Update active domains
    const domains: LifeDomain[] = [];
    if (content.includes('money') || content.includes('financial')) domains.push('financial');
    if (content.includes('career') || content.includes('job')) domains.push('career');
    if (content.includes('health') || content.includes('exercise')) domains.push('health');
    if (content.includes('mood') || content.includes('emotion')) domains.push('emotional');
    if (content.includes('relationship') || content.includes('social')) domains.push('social');
    
    if (domains.length > 0) {
      history.context.activeDomains = domains;
    }

    // Update conversation state
    if (message.role === 'user') {
      history.context.conversationState = 'information_gathering';
    } else if (message.role === 'assistant') {
      history.context.conversationState = 'recommendation';
    }
  }

  private generateId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Factory function to create AI Advisory service
export function createAIAdvisoryService(mcpClient: MCPClient): AIAdvisoryService {
  return new AIAdvisoryService(mcpClient);
}