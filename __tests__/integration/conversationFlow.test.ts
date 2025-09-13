// Integration tests for conversation workflows
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationManager } from '../../lib/services/conversationManager';
import { NLPService } from '../../lib/services/nlpService';
import { ChatMessage } from '../../lib/models/chat';

describe('Conversation Flow Integration', () => {
  let conversationManager: ConversationManager;
  let nlpService: NLPService;
  let userId: string;
  let sessionId: string;

  beforeEach(() => {
    conversationManager = new ConversationManager();
    nlpService = new NLPService();
    userId = 'test-user-1';
    sessionId = 'test-session-1';
  });

  describe('Financial Advisory Flow', () => {
    it('should handle a complete financial planning conversation', async () => {
      // Start session
      const session = await conversationManager.startSession(userId, sessionId);
      expect(session.id).toBe(sessionId);
      expect(session.userId).toBe(userId);

      // User asks about budgeting
      const message1: ChatMessage = {
        id: 'msg-1',
        content: 'I need help creating a budget for my family',
        type: 'user',
        timestamp: new Date()
      };

      const response1 = await conversationManager.processMessage(sessionId, message1);
      
      expect(response1.metadata.domain).toBe('financial');
      expect(response1.metadata.intent).toBe('request');
      expect(response1.followUpQuestions.length).toBeGreaterThan(0);
      expect(response1.suggestions.length).toBeGreaterThan(0);

      // User provides more details
      const message2: ChatMessage = {
        id: 'msg-2',
        content: 'We have a monthly income of $5000 and want to save for a house down payment',
        type: 'user',
        timestamp: new Date()
      };

      const response2 = await conversationManager.processMessage(sessionId, message2);
      
      expect(response2.metadata.entities.some((e: any) => e.type === 'amount')).toBe(true);
      expect(response2.confidence).toBeGreaterThan(0.5);

      // Check session state
      const updatedSession = conversationManager.getSession(sessionId);
      expect(updatedSession?.messages.length).toBe(2);
      expect(updatedSession?.metadata.primaryDomains).toContain('financial');
      expect(updatedSession?.context.currentTopic).toBe('financial');
    });

    it('should request clarification for vague financial queries', async () => {
      const session = await conversationManager.startSession(userId, sessionId);

      const message: ChatMessage = {
        id: 'msg-1',
        content: 'money stuff',
        type: 'user',
        timestamp: new Date()
      };

      const response = await conversationManager.processMessage(sessionId, message);
      
      expect(response.needsClarification).toBe(true);
      expect(response.suggestions.length).toBeGreaterThan(0);
      expect(response.message).toContain('more specific');
    });
  });

  describe('Career Guidance Flow', () => {
    it('should handle career transition conversations', async () => {
      const session = await conversationManager.startSession(userId, sessionId);

      const message1: ChatMessage = {
        id: 'msg-1',
        content: 'I want to change careers from marketing to software development',
        type: 'user',
        timestamp: new Date()
      };

      const response1 = await conversationManager.processMessage(sessionId, message1);
      
      expect(response1.metadata.domain).toBe('career');
      expect(response1.followUpQuestions.length).toBeGreaterThan(0);
      expect(response1.suggestions).toContain('Assess my skills and experience');

      // Follow-up question
      const message2: ChatMessage = {
        id: 'msg-2',
        content: 'I have 5 years of marketing experience but no programming background',
        type: 'user',
        timestamp: new Date()
      };

      const response2 = await conversationManager.processMessage(sessionId, message2);
      
      expect(response2.confidence).toBeGreaterThan(0.6);
      expect(response2.suggestions).toContain('Plan my professional development');
    });
  });

  describe('Multi-Domain Conversations', () => {
    it('should handle conversations spanning multiple life domains', async () => {
      const session = await conversationManager.startSession(userId, sessionId);

      // Start with financial question
      const message1: ChatMessage = {
        id: 'msg-1',
        content: 'I need to budget better because work stress is affecting my spending',
        type: 'user',
        timestamp: new Date()
      };

      const response1 = await conversationManager.processMessage(sessionId, message1);
      
      // Should detect both financial and emotional domains
      expect(['financial', 'emotional']).toContain(response1.metadata.domain);

      // Continue with emotional aspect
      const message2: ChatMessage = {
        id: 'msg-2',
        content: 'The stress is really overwhelming and I keep buying things to feel better',
        type: 'user',
        timestamp: new Date()
      };

      const response2 = await conversationManager.processMessage(sessionId, message2);
      
      expect(response2.metadata.domain).toBe('emotional');
      expect(response2.followUpQuestions.length).toBeGreaterThan(0);

      // Check that session tracks multiple domains
      const updatedSession = conversationManager.getSession(sessionId);
      expect(updatedSession?.metadata.primaryDomains.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Context Management', () => {
    it('should maintain conversation context across messages', async () => {
      const session = await conversationManager.startSession(userId, sessionId);

      // First message establishes context
      const message1: ChatMessage = {
        id: 'msg-1',
        content: 'I want to invest $10000 in stocks',
        type: 'user',
        timestamp: new Date()
      };

      await conversationManager.processMessage(sessionId, message1);

      // Second message references previous context
      const message2: ChatMessage = {
        id: 'msg-2',
        content: 'What about the risk involved?',
        type: 'user',
        timestamp: new Date()
      };

      const response2 = await conversationManager.processMessage(sessionId, message2);
      
      // Should understand this is still about financial/investment context
      expect(response2.metadata.domain).toBe('financial');
      
      const updatedSession = conversationManager.getSession(sessionId);
      expect(updatedSession?.context.currentTopic).toBe('financial');
      expect(updatedSession?.context.previousMessages.length).toBe(2);
    });

    it('should handle topic transitions gracefully', async () => {
      const session = await conversationManager.startSession(userId, sessionId);

      // Start with one topic
      const message1: ChatMessage = {
        id: 'msg-1',
        content: 'How can I save more money?',
        type: 'user',
        timestamp: new Date()
      };

      await conversationManager.processMessage(sessionId, message1);

      // Switch to different topic
      const message2: ChatMessage = {
        id: 'msg-2',
        content: 'Actually, I want to talk about my job interview tomorrow',
        type: 'user',
        timestamp: new Date()
      };

      const response2 = await conversationManager.processMessage(sessionId, message2);
      
      expect(response2.metadata.domain).toBe('career');
      
      const updatedSession = conversationManager.getSession(sessionId);
      expect(updatedSession?.context.currentTopic).toBe('career');
      expect(updatedSession?.metadata.primaryDomains).toContain('financial');
      expect(updatedSession?.metadata.primaryDomains).toContain('career');
    });
  });

  describe('Session Management', () => {
    it('should track session metadata correctly', async () => {
      const session = await conversationManager.startSession(userId, sessionId);

      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          content: 'Help me with my budget',
          type: 'user',
          timestamp: new Date()
        },
        {
          id: 'msg-2',
          content: 'I earn $4000 per month',
          type: 'user',
          timestamp: new Date()
        },
        {
          id: 'msg-3',
          content: 'My expenses are around $3000',
          type: 'user',
          timestamp: new Date()
        }
      ];

      for (const message of messages) {
        await conversationManager.processMessage(sessionId, message);
      }

      const updatedSession = conversationManager.getSession(sessionId);
      expect(updatedSession?.metadata.totalMessages).toBe(3);
      expect(updatedSession?.metadata.primaryDomains).toContain('financial');
      expect(updatedSession?.messages.length).toBe(3);
      expect(updatedSession?.lastActivity).toBeInstanceOf(Date);
    });

    it('should handle session cleanup', async () => {
      const session = await conversationManager.startSession(userId, sessionId);
      expect(conversationManager.getSession(sessionId)).toBeDefined();

      conversationManager.endSession(sessionId);
      expect(conversationManager.getSession(sessionId)).toBeUndefined();
    });
  });
});