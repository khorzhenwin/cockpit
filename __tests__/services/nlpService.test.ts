// Unit tests for NLP Service
import { describe, it, expect, beforeEach } from 'vitest';
import { NLPService, ConversationContext } from '../../lib/services/nlpService';
import { ChatMessage } from '../../lib/models/chat';

describe('NLPService', () => {
  let nlpService: NLPService;
  let mockContext: ConversationContext;

  beforeEach(() => {
    nlpService = new NLPService();
    mockContext = {
      userId: 'test-user',
      sessionId: 'test-session',
      previousMessages: [],
      currentTopic: undefined,
      userProfile: {
        preferences: [],
        goals: [],
        concerns: []
      }
    };
  });

  describe('Intent Detection', () => {
    it('should detect question intents correctly', () => {
      const queries = [
        'What should I do with my savings?',
        'How can I improve my career?',
        'Can you help me with budgeting?',
        'Is it a good time to invest?'
      ];

      queries.forEach(query => {
        const result = nlpService.parseQuery(query, mockContext);
        expect(result.intent.type).toBe('question');
        expect(result.intent.confidence).toBeGreaterThan(0);
      });
    });

    it('should detect request intents correctly', () => {
      const queries = [
        'Please help me create a budget',
        'I need advice on my career',
        'Could you recommend some investments?',
        'I want to improve my health'
      ];

      queries.forEach(query => {
        const result = nlpService.parseQuery(query, mockContext);
        expect(result.intent.type).toBe('request');
        expect(result.intent.confidence).toBeGreaterThan(0);
      });
    });

    it('should detect command intents correctly', () => {
      const queries = [
        'Analyze my spending patterns',
        'Show me my investment portfolio',
        'Calculate my retirement needs',
        'Create a fitness plan'
      ];

      queries.forEach(query => {
        const result = nlpService.parseQuery(query, mockContext);
        expect(result.intent.type).toBe('command');
        expect(result.intent.confidence).toBeGreaterThan(0);
      });
    });

    it('should detect greeting intents correctly', () => {
      const queries = [
        'Hello there',
        'Good morning',
        'Hi, how are you?',
        'Thanks for your help'
      ];

      queries.forEach(query => {
        const result = nlpService.parseQuery(query, mockContext);
        expect(result.intent.type).toBe('greeting');
        expect(result.intent.confidence).toBeGreaterThan(0);
      });
    });
  });

  describe('Domain Detection', () => {
    it('should detect financial domain correctly', () => {
      const queries = [
        'I need help with my budget and savings',
        'What should I invest in for retirement?',
        'My debt is getting out of control',
        'How can I improve my credit score?'
      ];

      queries.forEach(query => {
        const result = nlpService.parseQuery(query, mockContext);
        expect(result.intent.domain).toBe('financial');
        expect(result.intent.confidence).toBeGreaterThan(0);
      });
    });

    it('should detect career domain correctly', () => {
      const queries = [
        'I want to change my job and find better opportunities',
        'How can I get a promotion at work?',
        'I need to improve my professional skills',
        'Should I negotiate my salary?'
      ];

      queries.forEach(query => {
        const result = nlpService.parseQuery(query, mockContext);
        expect(result.intent.domain).toBe('career');
        expect(result.intent.confidence).toBeGreaterThan(0);
      });
    });

    it('should detect health domain correctly', () => {
      const queries = [
        'I want to improve my fitness and lose weight',
        'How can I get better sleep and reduce stress?',
        'I need help with my diet and nutrition',
        'My energy levels are really low lately'
      ];

      queries.forEach(query => {
        const result = nlpService.parseQuery(query, mockContext);
        expect(result.intent.domain).toBe('health');
        expect(result.intent.confidence).toBeGreaterThan(0);
      });
    });

    it('should detect emotional domain correctly', () => {
      const queries = [
        'I feel overwhelmed and anxious about everything',
        'My relationship is causing me stress',
        'I am feeling really sad and lonely',
        'How can I build more confidence?'
      ];

      queries.forEach(query => {
        const result = nlpService.parseQuery(query, mockContext);
        expect(result.intent.domain).toBe('emotional');
        expect(result.intent.confidence).toBeGreaterThan(0);
      });
    });
  });

  describe('Entity Extraction', () => {
    it('should extract monetary amounts correctly', () => {
      const queries = [
        'I have $5000 to invest',
        'My salary is 75000 dollars per year',
        'I need to save 10k for vacation',
        'The house costs $250,000'
      ];

      queries.forEach(query => {
        const result = nlpService.parseQuery(query, mockContext);
        const amountEntities = result.intent.entities.filter(e => e.type === 'amount');
        expect(amountEntities.length).toBeGreaterThan(0);
        expect(amountEntities[0].confidence).toBeGreaterThan(0);
      });
    });

    it('should extract dates correctly', () => {
      const queries = [
        'I want to retire by 2030',
        'My interview is tomorrow',
        'I started this job last month',
        'The deadline is 12/31/2024'
      ];

      queries.forEach(query => {
        const result = nlpService.parseQuery(query, mockContext);
        const dateEntities = result.intent.entities.filter(e => e.type === 'date');
        expect(dateEntities.length).toBeGreaterThan(0);
        expect(dateEntities[0].confidence).toBeGreaterThan(0);
      });
    });

    it('should extract emotions correctly', () => {
      const queries = [
        'I am feeling very anxious about this decision',
        'This makes me really happy and excited',
        'I feel frustrated with my current situation',
        'I am worried about my future'
      ];

      queries.forEach(query => {
        const result = nlpService.parseQuery(query, mockContext);
        const emotionEntities = result.intent.entities.filter(e => e.type === 'emotion');
        expect(emotionEntities.length).toBeGreaterThan(0);
        expect(emotionEntities[0].confidence).toBeGreaterThan(0);
      });
    });
  });

  describe('Keyword Extraction', () => {
    it('should extract relevant keywords', () => {
      const query = 'I need help creating a budget for my family expenses and savings goals';
      const result = nlpService.parseQuery(query, mockContext);
      
      expect(result.intent.keywords).toContain('budget');
      expect(result.intent.keywords).toContain('family');
      expect(result.intent.keywords).toContain('expenses');
      expect(result.intent.keywords).toContain('savings');
      expect(result.intent.keywords).toContain('goals');
      
      // Should not contain stop words
      expect(result.intent.keywords).not.toContain('the');
      expect(result.intent.keywords).not.toContain('and');
      expect(result.intent.keywords).not.toContain('for');
    });

    it('should limit keywords to reasonable number', () => {
      const longQuery = 'I really need comprehensive help with creating a detailed budget for my large family expenses and long-term savings goals and investment planning and debt management and retirement planning';
      const result = nlpService.parseQuery(longQuery, mockContext);
      
      expect(result.intent.keywords.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Follow-up Questions', () => {
    it('should generate relevant follow-up questions for financial queries', () => {
      const query = 'I want to invest some money';
      const result = nlpService.parseQuery(query, mockContext);
      
      expect(result.followUpQuestions.length).toBeGreaterThan(0);
      expect(result.followUpQuestions.some(q => q.includes('budget') || q.includes('timeline'))).toBe(true);
    });

    it('should generate follow-up questions for career queries', () => {
      const query = 'I need career advice';
      const result = nlpService.parseQuery(query, mockContext);
      
      expect(result.followUpQuestions.length).toBeGreaterThan(0);
      expect(result.followUpQuestions.some(q => q.includes('role') || q.includes('industry') || q.includes('stage'))).toBe(true);
    });

    it('should generate follow-up questions for emotional queries', () => {
      const query = 'I feel stressed';
      const result = nlpService.parseQuery(query, mockContext);
      
      expect(result.followUpQuestions.length).toBeGreaterThan(0);
      expect(result.followUpQuestions.some(q => q.includes('long') || q.includes('feeling'))).toBe(true);
    });
  });

  describe('Clarification Detection', () => {
    it('should detect when clarification is needed for vague queries', () => {
      const vageQueries = [
        'help',
        'what should I do',
        'I need advice',
        'stuff'
      ];

      vageQueries.forEach(query => {
        const result = nlpService.parseQuery(query, mockContext);
        expect(result.clarificationNeeded).toBe(true);
      });
    });

    it('should not require clarification for specific queries', () => {
      const specificQueries = [
        'How should I invest $10000 for retirement in the next 20 years?',
        'I want to negotiate my salary for my software engineering position',
        'I need help managing my anxiety about job interviews',
        'What exercises can help me lose 15 pounds in 3 months?'
      ];

      specificQueries.forEach(query => {
        const result = nlpService.parseQuery(query, mockContext);
        expect(result.clarificationNeeded).toBe(false);
      });
    });
  });

  describe('Context Extraction', () => {
    it('should extract context from conversation history', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          content: 'I want to invest in stocks',
          type: 'user',
          timestamp: new Date()
        },
        {
          id: '2',
          content: 'I have $5000 to start with',
          type: 'user',
          timestamp: new Date()
        },
        {
          id: '3',
          content: 'I am feeling anxious about the risk',
          type: 'user',
          timestamp: new Date()
        }
      ];

      const context = nlpService.extractContext(messages);
      
      expect(context.topics).toContain('financial');
      expect(context.topics).toContain('emotional');
      expect(context.entities.amount).toBeDefined();
      expect(context.entities.emotion).toBeDefined();
    });
  });

  describe('Conversation Flow Management', () => {
    it('should initialize conversation flow correctly', () => {
      const query = 'I need help with my budget';
      const parsedQuery = nlpService.parseQuery(query, mockContext);
      
      const flow = nlpService.manageConversationFlow(parsedQuery);
      
      expect(flow.currentStep).toBe('initial_assessment');
      expect(flow.nextSteps.length).toBeGreaterThan(0);
      expect(flow.requiredInfo.length).toBeGreaterThan(0);
      expect(flow.isComplete).toBe(false);
    });

    it('should update conversation flow with new information', () => {
      const query1 = 'I need financial advice';
      const parsedQuery1 = nlpService.parseQuery(query1, mockContext);
      const initialFlow = nlpService.manageConversationFlow(parsedQuery1);
      
      const query2 = 'I have $10000 to invest and want to retire in 20 years';
      const parsedQuery2 = nlpService.parseQuery(query2, mockContext);
      const updatedFlow = nlpService.manageConversationFlow(parsedQuery2, initialFlow);
      
      expect(updatedFlow.collectedInfo.budget).toBeDefined();
      expect(updatedFlow.collectedInfo.timeline).toBeDefined();
      expect(Object.keys(updatedFlow.collectedInfo).length).toBeGreaterThan(Object.keys(initialFlow.collectedInfo).length);
    });
  });
});