import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AIAdvisoryService,
  createAIAdvisoryService,
  type DomainPattern,
  type InsightGeneration,
  type RecommendationSystem,
  type ConversationHistory,
  type ConversationMessage,
} from '../../lib/services/aiAdvisory';
import { MCPClient, MCPClientImpl, defaultMCPConfig } from '../../lib/services/mcpClient';
import { LifeData } from '../../lib/models/lifeData';
import { UserProfile } from '../../lib/models/user';

describe('AIAdvisoryService', () => {
  let aiAdvisory: AIAdvisoryService;
  let mockMCPClient: MCPClient;
  let mockUserProfile: UserProfile;
  let mockLifeData: LifeData[];

  beforeEach(async () => {
    // Create a real MCP client for testing
    mockMCPClient = new MCPClientImpl(defaultMCPConfig);
    await mockMCPClient.connect();
    
    aiAdvisory = new AIAdvisoryService(mockMCPClient);

    mockUserProfile = {
      demographics: {
        age: 30,
        location: 'San Francisco',
        occupation: 'Software Engineer',
      },
      goals: [
        {
          id: 'goal1',
          domain: 'financial',
          title: 'Save for house',
          description: 'Save $100k for house down payment',
          priority: 'high',
          progress: 45,
          metrics: [
            {
              name: 'savings',
              currentValue: 45000,
              targetValue: 100000,
              unit: 'USD',
            },
          ],
        },
      ],
      values: [
        {
          name: 'financial_security',
          importance: 9,
        },
      ],
      riskTolerance: {
        financial: 'moderate',
        career: 'balanced',
        personal: 'moderate',
      },
      communicationStyle: {
        style: 'friendly',
        detail: 'moderate',
        frequency: 'regular',
        channels: ['in-app', 'email'],
      },
    };

    mockLifeData = [
      {
        userId: 'user123',
        domain: 'financial',
        timestamp: new Date('2024-01-01'),
        data: {
          type: 'transaction',
          amount: 100,
          category: 'groceries',
        },
        source: {
          id: 'source1',
          name: 'Bank API',
          type: 'api',
          reliability: 0.9,
        },
        confidence: 0.95,
        tags: ['spending', 'food'],
      },
      {
        userId: 'user123',
        domain: 'financial',
        timestamp: new Date('2024-01-02'),
        data: {
          type: 'transaction',
          amount: 150,
          category: 'groceries',
        },
        source: {
          id: 'source1',
          name: 'Bank API',
          type: 'api',
          reliability: 0.9,
        },
        confidence: 0.95,
        tags: ['spending', 'food'],
      },
      {
        userId: 'user123',
        domain: 'financial',
        timestamp: new Date('2024-01-03'),
        data: {
          type: 'transaction',
          amount: 200,
          category: 'groceries',
        },
        source: {
          id: 'source1',
          name: 'Bank API',
          type: 'api',
          reliability: 0.9,
        },
        confidence: 0.95,
        tags: ['spending', 'food'],
      },
      {
        userId: 'user123',
        domain: 'emotional',
        timestamp: new Date('2024-01-01'),
        data: {
          type: 'mood_entry',
          mood: 7,
          energy: 6,
          emotions: ['happy', 'motivated'],
        },
        source: {
          id: 'source2',
          name: 'Manual Entry',
          type: 'manual',
          reliability: 0.8,
        },
        confidence: 0.8,
        tags: ['mood', 'wellbeing'],
      },
      {
        userId: 'user123',
        domain: 'emotional',
        timestamp: new Date('2024-01-02'),
        data: {
          type: 'mood_entry',
          mood: 5,
          energy: 4,
          emotions: ['neutral', 'tired'],
        },
        source: {
          id: 'source2',
          name: 'Manual Entry',
          type: 'manual',
          reliability: 0.8,
        },
        confidence: 0.8,
        tags: ['mood', 'wellbeing'],
      },
      {
        userId: 'user123',
        domain: 'emotional',
        timestamp: new Date('2024-01-03'),
        data: {
          type: 'mood_entry',
          mood: 8,
          energy: 7,
          emotions: ['excited', 'optimistic'],
        },
        source: {
          id: 'source2',
          name: 'Manual Entry',
          type: 'manual',
          reliability: 0.8,
        },
        confidence: 0.8,
        tags: ['mood', 'wellbeing'],
      },
    ];
  });

  afterEach(async () => {
    await mockMCPClient.disconnect();
    vi.clearAllMocks();
  });

  describe('Pattern Analysis', () => {
    it('should analyze patterns across all domains', async () => {
      const patterns = await aiAdvisory.analyzePatterns('user123', mockLifeData);
      
      expect(patterns).toBeInstanceOf(Array);
      expect(patterns.length).toBeGreaterThan(0);
      
      // Should have patterns for both financial and emotional domains
      const domains = patterns.map(p => p.domain);
      expect(domains).toContain('financial');
      expect(domains).toContain('emotional');
    });

    it('should analyze patterns for specific domain', async () => {
      const patterns = await aiAdvisory.analyzePatterns('user123', mockLifeData, 'financial');
      
      expect(patterns).toBeInstanceOf(Array);
      expect(patterns.length).toBeGreaterThan(0);
      
      // All patterns should be financial
      patterns.forEach(pattern => {
        expect(pattern.domain).toBe('financial');
      });
    });

    it('should detect financial spending trends', async () => {
      const patterns = await aiAdvisory.analyzePatterns('user123', mockLifeData, 'financial');
      
      const spendingPattern = patterns.find(p => p.type === 'spending_trend');
      expect(spendingPattern).toBeDefined();
      expect(spendingPattern?.trend).toBe('increasing'); // 100 -> 150 -> 200
      expect(spendingPattern?.confidence).toBeGreaterThan(0);
      expect(spendingPattern?.supportingData.length).toBe(3);
    });

    it('should detect emotional mood cycles', async () => {
      const patterns = await aiAdvisory.analyzePatterns('user123', mockLifeData, 'emotional');
      
      const moodPattern = patterns.find(p => p.type === 'mood_cycle');
      expect(moodPattern).toBeDefined();
      expect(moodPattern?.confidence).toBeGreaterThan(0);
      expect(moodPattern?.supportingData.length).toBe(3);
    });

    it('should handle empty data gracefully', async () => {
      const patterns = await aiAdvisory.analyzePatterns('user123', []);
      
      expect(patterns).toBeInstanceOf(Array);
      expect(patterns.length).toBe(0);
    });

    it('should handle single domain with insufficient data', async () => {
      const singleDataPoint = [mockLifeData[0]];
      const patterns = await aiAdvisory.analyzePatterns('user123', singleDataPoint, 'financial');
      
      expect(patterns).toBeInstanceOf(Array);
      // Should return empty array or minimal patterns for insufficient data
    });
  });

  describe('Insight Generation', () => {
    it('should generate insights from patterns', async () => {
      const patterns = await aiAdvisory.analyzePatterns('user123', mockLifeData);
      const insights = await aiAdvisory.generateInsights('user123', patterns, mockUserProfile);
      
      expect(insights).toBeInstanceOf(Array);
      expect(insights.length).toBeGreaterThan(0);
      
      insights.forEach(insight => {
        expect(insight).toHaveProperty('id');
        expect(insight).toHaveProperty('title');
        expect(insight).toHaveProperty('description');
        expect(insight).toHaveProperty('confidence');
        expect(insight).toHaveProperty('reasoning');
        expect(insight.confidence).toBeGreaterThanOrEqual(0);
        expect(insight.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should include proactive insights from MCP', async () => {
      const patterns = await aiAdvisory.analyzePatterns('user123', mockLifeData);
      const insights = await aiAdvisory.generateInsights('user123', patterns, mockUserProfile);
      
      // Should include both pattern-based and proactive insights
      const patternInsights = insights.filter(i => i.type === 'pattern');
      const proactiveInsights = insights.filter(i => i.type === 'opportunity');
      
      expect(patternInsights.length).toBeGreaterThan(0);
      expect(proactiveInsights.length).toBeGreaterThan(0);
    });

    it('should sort insights by priority and confidence', async () => {
      const patterns = await aiAdvisory.analyzePatterns('user123', mockLifeData);
      const insights = await aiAdvisory.generateInsights('user123', patterns, mockUserProfile);
      
      if (insights.length > 1) {
        for (let i = 0; i < insights.length - 1; i++) {
          const current = insights[i];
          const next = insights[i + 1];
          
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          const currentPriority = priorityOrder[current.priority];
          const nextPriority = priorityOrder[next.priority];
          
          // Should be sorted by priority first, then confidence
          if (currentPriority === nextPriority) {
            expect(current.confidence).toBeGreaterThanOrEqual(next.confidence);
          } else {
            expect(currentPriority).toBeGreaterThanOrEqual(nextPriority);
          }
        }
      }
    });

    it('should handle empty patterns gracefully', async () => {
      const insights = await aiAdvisory.generateInsights('user123', [], mockUserProfile);
      
      expect(insights).toBeInstanceOf(Array);
      // Should still return proactive insights from MCP even with no patterns
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate recommendations from actionable insights', async () => {
      const patterns = await aiAdvisory.analyzePatterns('user123', mockLifeData);
      const insights = await aiAdvisory.generateInsights('user123', patterns, mockUserProfile);
      const recommendations = await aiAdvisory.generateRecommendations('user123', insights, mockUserProfile);
      
      expect(recommendations).toBeInstanceOf(Array);
      
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('id');
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('category');
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('confidence');
        expect(rec).toHaveProperty('steps');
        expect(rec.steps).toBeInstanceOf(Array);
        expect(rec.steps.length).toBeGreaterThan(0);
      });
    });

    it('should sort recommendations by priority and impact', async () => {
      const patterns = await aiAdvisory.analyzePatterns('user123', mockLifeData);
      const insights = await aiAdvisory.generateInsights('user123', patterns, mockUserProfile);
      const recommendations = await aiAdvisory.generateRecommendations('user123', insights, mockUserProfile);
      
      if (recommendations.length > 1) {
        for (let i = 0; i < recommendations.length - 1; i++) {
          const current = recommendations[i];
          const next = recommendations[i + 1];
          
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          const impactOrder = { major: 4, significant: 3, moderate: 2, minimal: 1 };
          
          const currentPriority = priorityOrder[current.priority];
          const nextPriority = priorityOrder[next.priority];
          
          if (currentPriority === nextPriority) {
            const currentImpact = impactOrder[current.expectedImpact];
            const nextImpact = impactOrder[next.expectedImpact];
            expect(currentImpact).toBeGreaterThanOrEqual(nextImpact);
          } else {
            expect(currentPriority).toBeGreaterThanOrEqual(nextPriority);
          }
        }
      }
    });

    it('should only generate recommendations for actionable insights', async () => {
      // Create a mix of actionable and non-actionable insights
      const mockInsights: InsightGeneration[] = [
        {
          id: 'insight1',
          title: 'Actionable Insight',
          description: 'This can be acted upon',
          type: 'opportunity',
          priority: 'medium',
          confidence: 0.8,
          reasoning: 'Test reasoning',
          domain: 'financial',
          relatedPatterns: [],
          actionable: true,
        },
        {
          id: 'insight2',
          title: 'Non-actionable Insight',
          description: 'This is just informational',
          type: 'pattern',
          priority: 'low',
          confidence: 0.6,
          reasoning: 'Test reasoning',
          domain: 'emotional',
          relatedPatterns: [],
          actionable: false,
        },
      ];

      const recommendations = await aiAdvisory.generateRecommendations('user123', mockInsights, mockUserProfile);
      
      // Should only have recommendations for actionable insights
      expect(recommendations.length).toBe(1);
      expect(recommendations[0].title).toContain('Actionable Insight');
    });
  });

  describe('Conversation History Management', () => {
    it('should create conversation history', () => {
      const history = aiAdvisory.createConversationHistory('user123');
      
      expect(history).toHaveProperty('sessionId');
      expect(history).toHaveProperty('userId', 'user123');
      expect(history).toHaveProperty('messages');
      expect(history).toHaveProperty('context');
      expect(history.messages).toBeInstanceOf(Array);
      expect(history.messages.length).toBe(0);
      expect(history.context.conversationState).toBe('greeting');
    });

    it('should create conversation history with preferences', () => {
      const preferences = {
        detailLevel: 'comprehensive' as const,
        communicationStyle: 'formal' as const,
        focusAreas: ['financial' as const],
        avoidTopics: ['personal'],
      };

      const history = aiAdvisory.createConversationHistory('user123', preferences);
      
      expect(history.context.preferences).toEqual(preferences);
    });

    it('should update conversation history with messages', () => {
      const history = aiAdvisory.createConversationHistory('user123');
      
      const message: ConversationMessage = {
        id: 'msg1',
        role: 'user',
        content: 'Tell me about my financial patterns',
        timestamp: new Date(),
      };

      const updatedHistory = aiAdvisory.updateConversationHistory(history.sessionId, message);
      
      expect(updatedHistory).toBeDefined();
      expect(updatedHistory!.messages.length).toBe(1);
      expect(updatedHistory!.messages[0]).toEqual(message);
      expect(updatedHistory!.context.activeDomains).toContain('financial');
      expect(updatedHistory!.context.userIntent).toBe('exploring_patterns');
    });

    it('should update conversation context based on message content', () => {
      const history = aiAdvisory.createConversationHistory('user123');
      
      // Test advice-seeking message
      const adviceMessage: ConversationMessage = {
        id: 'msg1',
        role: 'user',
        content: 'Can you give me advice about my career?',
        timestamp: new Date(),
      };

      const updatedHistory = aiAdvisory.updateConversationHistory(history.sessionId, adviceMessage);
      
      expect(updatedHistory!.context.userIntent).toBe('seeking_advice');
      expect(updatedHistory!.context.activeDomains).toContain('career');
    });

    it('should retrieve conversation history', () => {
      const history = aiAdvisory.createConversationHistory('user123');
      const retrieved = aiAdvisory.getConversationHistory(history.sessionId);
      
      expect(retrieved).toEqual(history);
    });

    it('should return null for non-existent conversation', () => {
      const retrieved = aiAdvisory.getConversationHistory('non-existent');
      
      expect(retrieved).toBeNull();
    });

    it('should clear conversation history', () => {
      const history = aiAdvisory.createConversationHistory('user123');
      aiAdvisory.clearConversationHistory(history.sessionId);
      
      const retrieved = aiAdvisory.getConversationHistory(history.sessionId);
      expect(retrieved).toBeNull();
    });
  });

  describe('Confidence Scoring and Reasoning', () => {
    it('should calculate confidence score correctly', () => {
      const confidence = aiAdvisory.calculateConfidenceScore(0.9, 0.8, 0.7, 0.6);
      
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
      
      // Should be weighted average: 0.9*0.3 + 0.8*0.25 + 0.7*0.25 + 0.6*0.2 = 0.765
      expect(confidence).toBeCloseTo(0.765, 2);
    });

    it('should generate reasoning for patterns and insights', () => {
      const mockPattern: DomainPattern = {
        id: 'pattern1',
        domain: 'financial',
        type: 'spending_trend',
        description: 'Increasing spending pattern',
        confidence: 0.8,
        strength: 0.7,
        frequency: 5,
        trend: 'increasing',
        timeframe: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-05'),
        },
        supportingData: mockLifeData.slice(0, 3),
      };

      const mockInsight: InsightGeneration = {
        id: 'insight1',
        title: 'Test Insight',
        description: 'Test description',
        type: 'pattern',
        priority: 'medium',
        confidence: 0.8,
        reasoning: '',
        domain: 'financial',
        relatedPatterns: ['pattern1'],
        actionable: true,
      };

      const reasoning = aiAdvisory.generateReasoning(mockPattern, mockInsight, { goals: true });
      
      expect(reasoning).toBeTruthy();
      expect(reasoning).toContain('3 data points');
      expect(reasoning).toContain('increasing trend');
      expect(reasoning).toContain('financial');
      expect(reasoning).toContain('high confidence'); // 0.8 should trigger high confidence
      expect(reasoning).toContain('goals');
    });

    it('should adjust reasoning based on confidence level', () => {
      const mockPattern: DomainPattern = {
        id: 'pattern1',
        domain: 'financial',
        type: 'spending_trend',
        description: 'Low confidence pattern',
        confidence: 0.4, // Low confidence
        strength: 0.3,
        frequency: 2,
        trend: 'stable',
        timeframe: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-02'),
        },
        supportingData: mockLifeData.slice(0, 2),
      };

      const mockInsight: InsightGeneration = {
        id: 'insight1',
        title: 'Test Insight',
        description: 'Test description',
        type: 'pattern',
        priority: 'low',
        confidence: 0.4,
        reasoning: '',
        domain: 'financial',
        relatedPatterns: ['pattern1'],
        actionable: false,
      };

      const reasoning = aiAdvisory.generateReasoning(mockPattern, mockInsight, {});
      
      expect(reasoning).toContain('limited confidence');
      expect(reasoning).toContain('insufficient data');
    });
  });

  describe('Factory Function', () => {
    it('should create AI advisory service', () => {
      const service = createAIAdvisoryService(mockMCPClient);
      
      expect(service).toBeInstanceOf(AIAdvisoryService);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in pattern analysis gracefully', async () => {
      // Create a service with a failing MCP client
      const failingMCPClient = {
        ...mockMCPClient,
        getProactiveInsights: vi.fn().mockRejectedValue(new Error('MCP Error')),
      } as unknown as MCPClient;

      const failingService = new AIAdvisoryService(failingMCPClient);
      
      const patterns = await failingService.analyzePatterns('user123', mockLifeData);
      
      // Should still return patterns even if MCP fails
      expect(patterns).toBeInstanceOf(Array);
    });

    it('should handle errors in insight generation gracefully', async () => {
      // Create a service with a failing MCP client
      const failingMCPClient = {
        ...mockMCPClient,
        getProactiveInsights: vi.fn().mockRejectedValue(new Error('MCP Error')),
      } as unknown as MCPClient;

      const failingService = new AIAdvisoryService(failingMCPClient);
      
      const patterns = await failingService.analyzePatterns('user123', mockLifeData);
      const insights = await failingService.generateInsights('user123', patterns, mockUserProfile);
      
      // Should return empty array on error
      expect(insights).toBeInstanceOf(Array);
    });

    it('should handle errors in recommendation generation gracefully', async () => {
      const mockInsights: InsightGeneration[] = [
        {
          id: 'insight1',
          title: 'Test Insight',
          description: 'Test description',
          type: 'opportunity',
          priority: 'medium',
          confidence: 0.8,
          reasoning: 'Test reasoning',
          domain: 'financial',
          relatedPatterns: [],
          actionable: true,
        },
      ];

      const recommendations = await aiAdvisory.generateRecommendations('user123', mockInsights, mockUserProfile);
      
      // Should handle gracefully even with potential errors
      expect(recommendations).toBeInstanceOf(Array);
    });
  });
});