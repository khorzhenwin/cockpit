// Conversation management service
import { ChatMessage } from '../models/chat';
import { NLPService, ParsedQuery, ConversationFlow, ConversationContext } from './nlpService';

export interface ConversationSession {
  id: string;
  userId: string;
  startTime: Date;
  lastActivity: Date;
  messages: ChatMessage[];
  context: ConversationContext;
  flow?: ConversationFlow;
  metadata: {
    totalMessages: number;
    primaryDomains: string[];
    userSatisfaction?: number;
    resolvedIssues: string[];
  };
}

export interface ConversationResponse {
  message: string;
  suggestions: string[];
  followUpQuestions: string[];
  needsClarification: boolean;
  confidence: number;
  metadata: {
    intent: string;
    domain: string;
    entities: any[];
  };
}

export class ConversationManager {
  private nlpService: NLPService;
  private activeSessions: Map<string, ConversationSession> = new Map();
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.nlpService = new NLPService();
    this.startSessionCleanup();
  }

  public async startSession(userId: string, sessionId?: string): Promise<ConversationSession> {
    const id = sessionId || this.generateSessionId();
    const now = new Date();

    const session: ConversationSession = {
      id,
      userId,
      startTime: now,
      lastActivity: now,
      messages: [],
      context: {
        userId,
        sessionId: id,
        previousMessages: [],
        currentTopic: undefined,
        userProfile: await this.loadUserProfile(userId)
      },
      metadata: {
        totalMessages: 0,
        primaryDomains: [],
        resolvedIssues: []
      }
    };

    this.activeSessions.set(id, session);
    return session;
  }

  public async processMessage(
    sessionId: string,
    message: ChatMessage
  ): Promise<ConversationResponse> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Update session
    session.messages.push(message);
    session.lastActivity = new Date();
    session.metadata.totalMessages++;

    // Update context with recent messages
    session.context.previousMessages = session.messages.slice(-10); // Keep last 10 messages

    // Parse the message
    const parsedQuery = this.nlpService.parseQuery(message.content, session.context);

    // Update conversation flow
    session.flow = this.nlpService.manageConversationFlow(parsedQuery, session.flow);

    // Update session metadata
    this.updateSessionMetadata(session, parsedQuery);

    // Generate response
    const response = await this.generateResponse(session, parsedQuery);

    return response;
  }

  private async generateResponse(
    session: ConversationSession,
    parsedQuery: ParsedQuery
  ): Promise<ConversationResponse> {
    const { intent, clarificationNeeded, followUpQuestions } = parsedQuery;
    
    let message = '';
    let suggestions: string[] = [];
    let confidence = intent.confidence;

    if (clarificationNeeded) {
      message = this.generateClarificationMessage(parsedQuery);
      suggestions = this.generateClarificationSuggestions(parsedQuery);
    } else {
      message = await this.generateContextualResponse(session, parsedQuery);
      suggestions = this.generateActionSuggestions(parsedQuery);
    }

    return {
      message,
      suggestions,
      followUpQuestions,
      needsClarification: clarificationNeeded,
      confidence,
      metadata: {
        intent: intent.type,
        domain: intent.domain,
        entities: intent.entities
      }
    };
  }

  private generateClarificationMessage(parsedQuery: ParsedQuery): string {
    const { intent } = parsedQuery;
    
    if (intent.domain === 'unknown') {
      return "I'd like to help you with that. Could you tell me more about what area of your life this relates to? For example, is this about finances, career, health, or relationships?";
    }

    if (intent.type === 'unknown') {
      return "I understand you're asking about " + intent.domain + ", but I'm not sure exactly what you'd like to know. Could you be more specific about what you're looking for?";
    }

    if (intent.confidence < 0.5) {
      return "I want to make sure I understand correctly. Could you rephrase your question or provide a bit more context?";
    }

    return "I need a bit more information to give you the best advice. Could you provide more details about your situation?";
  }

  private generateClarificationSuggestions(parsedQuery: ParsedQuery): string[] {
    const { intent } = parsedQuery;
    const suggestions: string[] = [];

    if (intent.domain === 'unknown') {
      suggestions.push(
        "I'm looking for financial advice",
        "I need career guidance",
        "I want to discuss my health and wellness",
        "I'm dealing with emotional or relationship issues"
      );
    } else {
      switch (intent.domain) {
        case 'financial':
          suggestions.push(
            "I want to create a budget",
            "I'm planning for retirement",
            "I need investment advice",
            "I'm dealing with debt"
          );
          break;
        case 'career':
          suggestions.push(
            "I'm looking for a new job",
            "I want a promotion",
            "I need to develop new skills",
            "I'm considering a career change"
          );
          break;
        case 'health':
          suggestions.push(
            "I want to improve my fitness",
            "I'm struggling with stress",
            "I need better sleep habits",
            "I want to eat healthier"
          );
          break;
        case 'emotional':
          suggestions.push(
            "I'm feeling overwhelmed",
            "I'm having relationship issues",
            "I need help managing anxiety",
            "I want to build confidence"
          );
          break;
      }
    }

    return suggestions.slice(0, 4);
  }

  private async generateContextualResponse(
    session: ConversationSession,
    parsedQuery: ParsedQuery
  ): Promise<string> {
    const { intent, context } = parsedQuery;
    
    // This would typically call the MCP service for AI-generated responses
    // For now, we'll generate template responses based on intent and domain
    
    let response = '';
    
    switch (intent.domain) {
      case 'financial':
        response = this.generateFinancialResponse(intent, session);
        break;
      case 'career':
        response = this.generateCareerResponse(intent, session);
        break;
      case 'health':
        response = this.generateHealthResponse(intent, session);
        break;
      case 'emotional':
        response = this.generateEmotionalResponse(intent, session);
        break;
      default:
        response = this.generateGeneralResponse(intent, session);
    }

    return response;
  }

  private generateFinancialResponse(intent: any, session: ConversationSession): string {
    const responses = [
      "Based on your financial situation, I can help you create a personalized plan. Let me analyze your current position and goals.",
      "Financial planning is crucial for long-term success. I'll consider your income, expenses, and objectives to provide tailored advice.",
      "I understand you're looking for financial guidance. Let me review your information and suggest some strategies that align with your goals."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateCareerResponse(intent: any, session: ConversationSession): string {
    const responses = [
      "Career development is a journey, and I'm here to help guide you. Let me assess your current situation and identify opportunities for growth.",
      "Your professional growth is important. I'll analyze your skills, experience, and goals to suggest the best path forward.",
      "I can help you navigate your career decisions. Let me consider your background and aspirations to provide strategic advice."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateHealthResponse(intent: any, session: ConversationSession): string {
    const responses = [
      "Your health and wellness are fundamental to everything else. Let me help you create a balanced approach to improving your well-being.",
      "I understand you're focused on health improvements. I'll consider your lifestyle and goals to suggest practical steps you can take.",
      "Health is wealth, as they say. Let me analyze your situation and provide personalized recommendations for better wellness."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateEmotionalResponse(intent: any, session: ConversationSession): string {
    const responses = [
      "I hear you, and your feelings are valid. Let me help you understand what you're experiencing and find healthy ways to cope.",
      "Emotional well-being is just as important as physical health. I'm here to support you through this and help you find balance.",
      "Thank you for sharing how you're feeling. Let me provide some perspective and practical strategies to help you navigate this situation."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateGeneralResponse(intent: any, session: ConversationSession): string {
    return "I'm here to help you with various aspects of your life. Could you tell me more about what specific area you'd like to focus on today?";
  }

  private generateActionSuggestions(parsedQuery: ParsedQuery): string[] {
    const { intent } = parsedQuery;
    const suggestions: string[] = [];

    switch (intent.domain) {
      case 'financial':
        suggestions.push(
          "Review my current budget",
          "Analyze my investment portfolio",
          "Create a savings plan",
          "Discuss debt management"
        );
        break;
      case 'career':
        suggestions.push(
          "Assess my skills and experience",
          "Explore new opportunities",
          "Plan my professional development",
          "Discuss salary negotiation"
        );
        break;
      case 'health':
        suggestions.push(
          "Create a fitness plan",
          "Improve my sleep habits",
          "Manage stress better",
          "Plan healthier meals"
        );
        break;
      case 'emotional':
        suggestions.push(
          "Explore coping strategies",
          "Discuss relationship dynamics",
          "Build emotional resilience",
          "Find work-life balance"
        );
        break;
    }

    return suggestions.slice(0, 3);
  }

  private updateSessionMetadata(session: ConversationSession, parsedQuery: ParsedQuery): void {
    const { intent } = parsedQuery;
    
    // Track primary domains
    if (intent.domain !== 'unknown' && !session.metadata.primaryDomains.includes(intent.domain)) {
      session.metadata.primaryDomains.push(intent.domain);
    }

    // Update current topic
    if (intent.domain !== 'unknown') {
      session.context.currentTopic = intent.domain;
    }
  }

  private async loadUserProfile(userId: string): Promise<any> {
    // This would typically load user profile from database
    // For now, return a default profile
    return {
      preferences: [],
      goals: [],
      concerns: []
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startSessionCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (now - session.lastActivity.getTime() > this.sessionTimeout) {
          this.activeSessions.delete(sessionId);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  public getSession(sessionId: string): ConversationSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  public endSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  public getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }
}