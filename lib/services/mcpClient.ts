// MCP client interface and implementation

import { LifeData } from '../models/lifeData';
import { UserProfile } from '../models/user';
import { Priority, LifeDomain } from '../models/common';

// Core MCP interfaces
export interface AIResponse {
  insights: string[];
  recommendations: Recommendation[];
  confidence: number;
  reasoning: string;
  followUpQuestions?: string[];
  metadata?: Record<string, any>;
}

export interface Recommendation {
  id: string;
  action: string;
  reasoning: string;
  priority: Priority;
  estimatedEffort: 'minimal' | 'low' | 'moderate' | 'high' | 'extensive';
  expectedOutcome: string;
  crossDomainImpacts: DomainImpact[];
}

export interface DomainImpact {
  domain: LifeDomain;
  impact: 'minimal' | 'moderate' | 'significant' | 'major';
  description: string;
}

export interface ProactiveInsight {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  domain: LifeDomain;
  actionRequired: boolean;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  messages: ConversationMessage[];
  currentTopic?: string;
  relevantDomains: LifeDomain[];
  lastActivity: Date;
}

export interface ConversationResponse {
  response: string;
  suggestions: string[];
  context: ConversationContext;
  needsMoreInfo: boolean;
  confidence: number;
}

export interface LifeSituation {
  description: string;
  domain: LifeDomain;
  context: Record<string, any>;
  urgency: 'low' | 'medium' | 'high';
  relatedData?: LifeData[];
}

export interface AdviceResponse {
  advice: string;
  reasoning: string;
  alternatives: string[];
  risks: string[];
  nextSteps: string[];
  confidence: number;
  followUpQuestions?: string[];
}

// MCP Connection and Health Monitoring
export interface MCPServerConfig {
  url: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  healthCheckInterval: number;
  apiKey?: string;
}

export interface MCPConnectionStatus {
  isConnected: boolean;
  lastHealthCheck: Date;
  responseTime: number;
  errorCount: number;
  lastError?: string;
}

export interface MCPHealthMetrics {
  uptime: number;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  lastErrors: string[];
}

// Error types for MCP communication
export class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export class MCPConnectionError extends MCPError {
  constructor(message: string, originalError?: Error) {
    super(message, 'CONNECTION_ERROR', true, originalError);
    this.name = 'MCPConnectionError';
  }
}

export class MCPTimeoutError extends MCPError {
  constructor(message: string) {
    super(message, 'TIMEOUT_ERROR', true);
    this.name = 'MCPTimeoutError';
  }
}

export class MCPRateLimitError extends MCPError {
  constructor(message: string, public retryAfter: number) {
    super(message, 'RATE_LIMIT_ERROR', true);
    this.name = 'MCPRateLimitError';
  }
}

// Main MCP Client interface
export interface MCPClient {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnectionStatus(): MCPConnectionStatus;
  getHealthMetrics(): MCPHealthMetrics;

  // Core AI functions
  sendAnalysisRequest(data: LifeData[], query: string): Promise<AIResponse>;
  getProactiveInsights(userProfile: UserProfile): Promise<ProactiveInsight[]>;
  processConversation(context: ConversationContext, message: string): Promise<ConversationResponse>;
  requestAdvice(situation: LifeSituation): Promise<AdviceResponse>;

  // Context management
  createConversationContext(userId: string): ConversationContext;
  updateConversationContext(context: ConversationContext, message: ConversationMessage): ConversationContext;
  clearConversationContext(sessionId: string): void;
}

// MCP Client Implementation
export class MCPClientImpl implements MCPClient {
  private config: MCPServerConfig;
  private connectionStatus: MCPConnectionStatus;
  private healthMetrics: MCPHealthMetrics;
  private conversationContexts: Map<string, ConversationContext>;
  private healthCheckInterval?: NodeJS.Timeout;
  private requestQueue: Array<{ request: any; resolve: any; reject: any }>;
  private isProcessingQueue: boolean;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.connectionStatus = {
      isConnected: false,
      lastHealthCheck: new Date(),
      responseTime: 0,
      errorCount: 0,
    };
    this.healthMetrics = {
      uptime: 0,
      averageResponseTime: 0,
      successRate: 0,
      errorRate: 0,
      lastErrors: [],
    };
    this.conversationContexts = new Map();
    this.requestQueue = [];
    this.isProcessingQueue = false;
  }

  // Connection Management
  async connect(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Simulate MCP server connection
      const response = await this.makeRequest('/health', 'GET');
      
      if (response.status === 'healthy') {
        this.connectionStatus.isConnected = true;
        this.connectionStatus.responseTime = Date.now() - startTime;
        this.connectionStatus.errorCount = 0;
        
        // Start health check interval
        this.startHealthChecks();
        
        console.log('MCP Client connected successfully');
      } else {
        throw new MCPConnectionError('MCP server is not healthy');
      }
    } catch (error) {
      this.connectionStatus.isConnected = false;
      this.connectionStatus.errorCount++;
      this.connectionStatus.lastError = error instanceof Error ? error.message : 'Unknown error';
      
      throw new MCPConnectionError(
        `Failed to connect to MCP server: ${this.connectionStatus.lastError}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async disconnect(): Promise<void> {
    this.connectionStatus.isConnected = false;
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    
    // Clear conversation contexts
    this.conversationContexts.clear();
    
    console.log('MCP Client disconnected');
  }

  isConnected(): boolean {
    return this.connectionStatus.isConnected;
  }

  getConnectionStatus(): MCPConnectionStatus {
    return { ...this.connectionStatus };
  }

  getHealthMetrics(): MCPHealthMetrics {
    return { ...this.healthMetrics };
  }

  // Core AI Functions
  async sendAnalysisRequest(data: LifeData[], query: string): Promise<AIResponse> {
    if (!this.isConnected()) {
      throw new MCPConnectionError('MCP client is not connected');
    }

    try {
      const request = {
        type: 'analysis',
        data: data.map(d => ({
          domain: d.domain,
          timestamp: d.timestamp,
          data: d.data,
          confidence: d.confidence,
          tags: d.tags,
        })),
        query,
        timestamp: new Date(),
      };

      const response = await this.makeRequestWithRetry('/analyze', 'POST', request);
      
      return {
        insights: response.insights || [],
        recommendations: response.recommendations || [],
        confidence: response.confidence || 0.5,
        reasoning: response.reasoning || 'Analysis completed',
        followUpQuestions: response.followUpQuestions,
        metadata: response.metadata,
      };
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async getProactiveInsights(userProfile: UserProfile): Promise<ProactiveInsight[]> {
    if (!this.isConnected()) {
      throw new MCPConnectionError('MCP client is not connected');
    }

    try {
      const request = {
        type: 'proactive_insights',
        userProfile: {
          demographics: userProfile.demographics,
          goals: userProfile.goals,
          values: userProfile.values,
          riskTolerance: userProfile.riskTolerance,
        },
        timestamp: new Date(),
      };

      const response = await this.makeRequestWithRetry('/insights', 'POST', request);
      
      return response.insights?.map((insight: any) => ({
        id: insight.id || this.generateId(),
        title: insight.title,
        description: insight.description,
        priority: insight.priority || 'medium',
        domain: insight.domain,
        actionRequired: insight.actionRequired || false,
        expiresAt: insight.expiresAt ? new Date(insight.expiresAt) : undefined,
        metadata: insight.metadata,
      })) || [];
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async processConversation(context: ConversationContext, message: string): Promise<ConversationResponse> {
    if (!this.isConnected()) {
      throw new MCPConnectionError('MCP client is not connected');
    }

    try {
      const userMessage: ConversationMessage = {
        id: this.generateId(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      };

      const updatedContext = this.updateConversationContext(context, userMessage);

      const request = {
        type: 'conversation',
        context: {
          sessionId: updatedContext.sessionId,
          userId: updatedContext.userId,
          messages: updatedContext.messages.slice(-10), // Send last 10 messages for context
          currentTopic: updatedContext.currentTopic,
          relevantDomains: updatedContext.relevantDomains,
        },
        message,
        timestamp: new Date(),
      };

      const response = await this.makeRequestWithRetry('/conversation', 'POST', request);
      
      const assistantMessage: ConversationMessage = {
        id: this.generateId(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        metadata: response.metadata,
      };

      const finalContext = this.updateConversationContext(updatedContext, assistantMessage);
      
      return {
        response: response.response,
        suggestions: response.suggestions || [],
        context: finalContext,
        needsMoreInfo: response.needsMoreInfo || false,
        confidence: response.confidence || 0.8,
      };
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async requestAdvice(situation: LifeSituation): Promise<AdviceResponse> {
    if (!this.isConnected()) {
      throw new MCPConnectionError('MCP client is not connected');
    }

    try {
      const request = {
        type: 'advice',
        situation: {
          description: situation.description,
          domain: situation.domain,
          context: situation.context,
          urgency: situation.urgency,
          relatedData: situation.relatedData?.map(d => ({
            domain: d.domain,
            timestamp: d.timestamp,
            data: d.data,
            confidence: d.confidence,
          })),
        },
        timestamp: new Date(),
      };

      const response = await this.makeRequestWithRetry('/advice', 'POST', request);
      
      return {
        advice: response.advice,
        reasoning: response.reasoning || 'Based on available data and patterns',
        alternatives: response.alternatives || [],
        risks: response.risks || [],
        nextSteps: response.nextSteps || [],
        confidence: response.confidence || 0.7,
        followUpQuestions: response.followUpQuestions,
      };
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  // Context Management
  createConversationContext(userId: string): ConversationContext {
    const context: ConversationContext = {
      sessionId: this.generateId(),
      userId,
      messages: [],
      relevantDomains: [],
      lastActivity: new Date(),
    };

    this.conversationContexts.set(context.sessionId, context);
    return context;
  }

  updateConversationContext(context: ConversationContext, message: ConversationMessage): ConversationContext {
    const updatedContext = {
      ...context,
      messages: [...context.messages, message],
      lastActivity: new Date(),
    };

    // Update relevant domains based on message content
    if (message.role === 'user') {
      updatedContext.relevantDomains = this.extractRelevantDomains(message.content);
    }

    this.conversationContexts.set(updatedContext.sessionId, updatedContext);
    return updatedContext;
  }

  clearConversationContext(sessionId: string): void {
    this.conversationContexts.delete(sessionId);
  }

  // Private helper methods
  private async makeRequest(endpoint: string, method: string, data?: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Simulate HTTP request to MCP server
      // In a real implementation, this would use fetch or axios
      const mockResponse = await this.simulateMCPRequest(endpoint, method, data);
      
      const responseTime = Date.now() - startTime;
      this.updateHealthMetrics(true, responseTime);
      
      return mockResponse;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateHealthMetrics(false, responseTime);
      throw error;
    }
  }

  private async makeRequestWithRetry(endpoint: string, method: string, data?: any): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await this.makeRequest(endpoint, method, data);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (error instanceof MCPRateLimitError) {
          await this.delay(error.retryAfter * 1000);
          continue;
        }
        
        if (error instanceof MCPConnectionError && attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
          continue;
        }
        
        if (!(error instanceof MCPError) || !error.retryable) {
          throw error;
        }
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }
    
    throw lastError!;
  }

  private async simulateMCPRequest(endpoint: string, method: string, data?: any): Promise<any> {
    // Simulate network delay
    await this.delay(100 + Math.random() * 200);
    
    // Simulate occasional errors for testing (very low rate for stable tests)
    if (Math.random() < 0.001) {
      throw new MCPConnectionError('Simulated connection error');
    }
    
    switch (endpoint) {
      case '/health':
        return { status: 'healthy', timestamp: new Date() };
      
      case '/analyze':
        return {
          insights: [
            'Pattern detected in financial spending',
            'Correlation found between stress and spending',
          ],
          recommendations: [
            {
              id: this.generateId(),
              action: 'Review monthly budget allocation',
              reasoning: 'Spending patterns show potential for optimization',
              priority: 'medium',
              estimatedEffort: 'low',
              expectedOutcome: 'Improved financial stability',
              crossDomainImpacts: [
                {
                  domain: 'emotional',
                  impact: 'moderate',
                  description: 'Reduced financial stress',
                },
              ],
            },
          ],
          confidence: 0.85,
          reasoning: 'Analysis based on recent transaction patterns and historical data',
        };
      
      case '/insights':
        return {
          insights: [
            {
              id: this.generateId(),
              title: 'Career Growth Opportunity',
              description: 'Market trends suggest good timing for skill development',
              priority: 'medium',
              domain: 'career',
              actionRequired: true,
            },
          ],
        };
      
      case '/conversation':
        return {
          response: 'I understand your concern. Based on your data, here are some insights...',
          suggestions: [
            'Would you like me to analyze your recent spending patterns?',
            'Should we look at your career goals?',
          ],
          needsMoreInfo: false,
          confidence: 0.8,
        };
      
      case '/advice':
        return {
          advice: 'Based on your situation, I recommend taking a balanced approach...',
          reasoning: 'This recommendation considers your risk profile and current goals',
          alternatives: ['Alternative approach A', 'Alternative approach B'],
          risks: ['Potential risk 1', 'Potential risk 2'],
          nextSteps: ['Step 1: Assess current situation', 'Step 2: Create action plan'],
          confidence: 0.75,
        };
      
      default:
        throw new MCPError(`Unknown endpoint: ${endpoint}`, 'UNKNOWN_ENDPOINT');
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.makeRequest('/health', 'GET');
        this.connectionStatus.lastHealthCheck = new Date();
      } catch (error) {
        this.connectionStatus.errorCount++;
        this.connectionStatus.lastError = error instanceof Error ? error.message : 'Health check failed';
        
        if (this.connectionStatus.errorCount > 3) {
          this.connectionStatus.isConnected = false;
        }
      }
    }, this.config.healthCheckInterval);
  }

  private updateHealthMetrics(success: boolean, responseTime: number): void {
    // Track total requests for calculating averages
    const currentSuccessCount = this.healthMetrics.successRate;
    const currentErrorCount = this.healthMetrics.errorRate;
    const totalRequests = currentSuccessCount + currentErrorCount;
    
    if (success) {
      this.healthMetrics.successRate = currentSuccessCount + 1;
    } else {
      this.healthMetrics.errorRate = currentErrorCount + 1;
    }
    
    const newTotalRequests = this.healthMetrics.successRate + this.healthMetrics.errorRate;
    
    // Update average response time
    this.healthMetrics.averageResponseTime = 
      ((this.healthMetrics.averageResponseTime * totalRequests) + responseTime) / newTotalRequests;
  }

  private handleError(error: any): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.healthMetrics.lastErrors.unshift(errorMessage);
    
    // Keep only last 10 errors
    if (this.healthMetrics.lastErrors.length > 10) {
      this.healthMetrics.lastErrors = this.healthMetrics.lastErrors.slice(0, 10);
    }
    
    this.connectionStatus.errorCount++;
    this.connectionStatus.lastError = errorMessage;
  }

  private extractRelevantDomains(message: string): LifeDomain[] {
    const domains: LifeDomain[] = [];
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('money') || lowerMessage.includes('financial') || lowerMessage.includes('budget')) {
      domains.push('financial');
    }
    if (lowerMessage.includes('career') || lowerMessage.includes('job') || lowerMessage.includes('work')) {
      domains.push('career');
    }
    if (lowerMessage.includes('health') || lowerMessage.includes('exercise') || lowerMessage.includes('sleep')) {
      domains.push('health');
    }
    if (lowerMessage.includes('stress') || lowerMessage.includes('mood') || lowerMessage.includes('emotion')) {
      domains.push('emotional');
    }
    if (lowerMessage.includes('relationship') || lowerMessage.includes('social') || lowerMessage.includes('friend')) {
      domains.push('social');
    }
    
    return domains.length > 0 ? domains : ['personal'];
  }

  private generateId(): string {
    return `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Default MCP client configuration
export const defaultMCPConfig: MCPServerConfig = {
  url: process.env.MCP_SERVER_URL || 'http://localhost:3001',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  healthCheckInterval: 60000,
  apiKey: process.env.MCP_API_KEY,
};

// Factory function to create MCP client instance
export function createMCPClient(config?: Partial<MCPServerConfig>): MCPClient {
  const finalConfig = { ...defaultMCPConfig, ...config };
  return new MCPClientImpl(finalConfig);
}