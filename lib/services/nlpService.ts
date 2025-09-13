// Natural Language Processing service for chat interface
import { ChatMessage } from '../models/chat';

export interface QueryIntent {
  type: 'question' | 'request' | 'command' | 'greeting' | 'unknown';
  domain: 'financial' | 'career' | 'health' | 'emotional' | 'general' | 'unknown';
  confidence: number;
  entities: Entity[];
  keywords: string[];
}

export interface Entity {
  type: 'person' | 'date' | 'amount' | 'location' | 'organization' | 'skill' | 'emotion';
  value: string;
  confidence: number;
  position: [number, number]; // start and end positions in text
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  previousMessages: ChatMessage[];
  currentTopic?: string;
  userProfile?: {
    preferences: string[];
    goals: string[];
    concerns: string[];
  };
}

export interface ParsedQuery {
  originalText: string;
  intent: QueryIntent;
  context: ConversationContext;
  followUpQuestions: string[];
  clarificationNeeded: boolean;
}

export interface ConversationFlow {
  currentStep: string;
  nextSteps: string[];
  requiredInfo: string[];
  collectedInfo: Record<string, any>;
  isComplete: boolean;
}

export class NLPService {
  private intentPatterns: Map<string, RegExp[]> = new Map();
  private domainKeywords: Map<string, string[]> = new Map();
  private entityPatterns: Map<string, RegExp> = new Map();

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    // Intent patterns
    this.intentPatterns.set('question', [
      /^(what|how|when|where|why|who|which|can|could|would|should|is|are|do|does|did)\b/i,
      /\?$/,
      /\b(help|explain|tell me|show me)\b/i
    ]);

    this.intentPatterns.set('request', [
      /^(please|can you|could you|would you|i need|i want|i would like)\b/i,
      /\b(recommend|suggest|advise|help me)\b/i
    ]);

    this.intentPatterns.set('command', [
      /^(analyze|calculate|show|display|create|update|delete|find)\b/i,
      /\b(let's|let me)\b/i
    ]);

    this.intentPatterns.set('greeting', [
      /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)\b/i,
      /\b(thanks|thank you|bye|goodbye|see you)\b/i
    ]);

    // Domain keywords
    this.domainKeywords.set('financial', [
      'money', 'budget', 'investment', 'savings', 'debt', 'loan', 'mortgage', 'credit',
      'portfolio', 'stocks', 'bonds', 'retirement', 'tax', 'income', 'expense', 'bank',
      'financial', 'finance', 'wealth', 'asset', 'liability', 'cash flow'
    ]);

    this.domainKeywords.set('career', [
      'job', 'career', 'work', 'employment', 'salary', 'promotion', 'skills', 'resume',
      'interview', 'networking', 'professional', 'workplace', 'boss', 'colleague',
      'industry', 'company', 'position', 'role', 'responsibility', 'performance'
    ]);

    this.domainKeywords.set('health', [
      'health', 'fitness', 'exercise', 'diet', 'nutrition', 'sleep', 'stress', 'wellness',
      'medical', 'doctor', 'symptoms', 'medication', 'treatment', 'therapy', 'mental health',
      'physical', 'weight', 'energy', 'fatigue', 'pain'
    ]);

    this.domainKeywords.set('emotional', [
      'feel', 'feeling', 'emotion', 'mood', 'happy', 'sad', 'angry', 'anxious', 'stressed',
      'depressed', 'excited', 'worried', 'confident', 'insecure', 'relationship', 'love',
      'friendship', 'family', 'social', 'lonely', 'overwhelmed', 'frustrated'
    ]);

    // Entity patterns
    this.entityPatterns.set('date', /\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|today|tomorrow|yesterday|next week|last month|this year)\b/gi);
    this.entityPatterns.set('amount', /\$[\d,]+\.?\d*|\b\d+\s*(dollars?|cents?|k|thousand|million|billion)\b/gi);
    this.entityPatterns.set('person', /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g);
    this.entityPatterns.set('emotion', /\b(happy|sad|angry|anxious|excited|worried|confident|stressed|overwhelmed|frustrated|content|peaceful)\b/gi);
  }

  public parseQuery(text: string, context: ConversationContext): ParsedQuery {
    const intent = this.detectIntent(text);
    const entities = this.extractEntities(text);
    const followUpQuestions = this.generateFollowUpQuestions(intent, entities, context);
    const clarificationNeeded = this.needsClarification(intent, entities, context);

    return {
      originalText: text,
      intent: {
        ...intent,
        entities,
        keywords: this.extractKeywords(text)
      },
      context,
      followUpQuestions,
      clarificationNeeded
    };
  }

  private detectIntent(text: string): QueryIntent {
    const normalizedText = text.toLowerCase().trim();
    let bestMatch: { type: string; confidence: number; domain: string } = {
      type: 'unknown',
      confidence: 0,
      domain: 'unknown'
    };

    // Check intent patterns
    for (const [intentType, patterns] of this.intentPatterns.entries()) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedText)) {
          const confidence = this.calculateIntentConfidence(normalizedText, pattern);
          if (confidence > bestMatch.confidence) {
            bestMatch = { type: intentType, confidence, domain: bestMatch.domain };
          }
        }
      }
    }

    // Detect domain
    const domain = this.detectDomain(normalizedText);
    bestMatch.domain = domain.domain;

    return {
      type: bestMatch.type as QueryIntent['type'],
      domain: bestMatch.domain as QueryIntent['domain'],
      confidence: Math.max(bestMatch.confidence, domain.confidence),
      entities: [],
      keywords: []
    };
  }

  private detectDomain(text: string): { domain: string; confidence: number } {
    let bestMatch = { domain: 'unknown', confidence: 0 };

    for (const [domain, keywords] of this.domainKeywords.entries()) {
      let matches = 0;
      let totalKeywords = keywords.length;

      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          matches++;
        }
      }

      const confidence = matches / totalKeywords;
      if (confidence > bestMatch.confidence) {
        bestMatch = { domain, confidence };
      }
    }

    return bestMatch;
  }

  private calculateIntentConfidence(text: string, pattern: RegExp): number {
    const matches = text.match(pattern);
    if (!matches) return 0;

    // Simple confidence based on match length and position
    const matchLength = matches[0].length;
    const textLength = text.length;
    const position = text.indexOf(matches[0]);
    
    // Higher confidence for longer matches and matches at the beginning
    const lengthScore = matchLength / textLength;
    const positionScore = position === 0 ? 1 : 0.5;
    
    return Math.min(lengthScore + positionScore, 1);
  }

  private extractEntities(text: string): Entity[] {
    const entities: Entity[] = [];

    for (const [entityType, pattern] of this.entityPatterns.entries()) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        if (match.index !== undefined) {
          entities.push({
            type: entityType as Entity['type'],
            value: match[0],
            confidence: 0.8, // Simple confidence score
            position: [match.index, match.index + match[0].length]
          });
        }
      }
    }

    return entities;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - remove stop words and get important terms
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'i', 'you', 'he',
      'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
      'her', 'its', 'our', 'their'
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit to top 10 keywords
  }

  private generateFollowUpQuestions(
    intent: QueryIntent,
    entities: Entity[],
    context: ConversationContext
  ): string[] {
    const questions: string[] = [];

    // Generate questions based on intent and domain
    if (intent.domain === 'financial') {
      if (intent.type === 'question' && !entities.some(e => e.type === 'amount')) {
        questions.push("What's your budget range for this?");
      }
      if (!entities.some(e => e.type === 'date')) {
        questions.push("What's your timeline for this financial goal?");
      }
    }

    if (intent.domain === 'career') {
      if (intent.type === 'question' && !entities.some(e => e.type === 'person')) {
        questions.push("Are you looking for advice about a specific role or industry?");
      }
      questions.push("What's your current career stage?");
    }

    if (intent.domain === 'emotional') {
      questions.push("How long have you been feeling this way?");
      questions.push("What do you think might be contributing to these feelings?");
    }

    // Generic follow-up questions
    if (intent.confidence < 0.7) {
      questions.push("Could you provide more details about what you're looking for?");
    }

    return questions.slice(0, 3); // Limit to 3 questions
  }

  private needsClarification(
    intent: QueryIntent,
    entities: Entity[],
    context: ConversationContext
  ): boolean {
    // Need clarification if:
    // 1. Intent confidence is low
    // 2. Domain is unknown
    // 3. Question is too vague
    // 4. Missing critical entities for the domain

    if (intent.confidence < 0.5) return true;
    if (intent.domain === 'unknown') return true;
    if (intent.type === 'unknown') return true;

    // Domain-specific clarification needs
    if (intent.domain === 'financial' && intent.type === 'request') {
      const hasAmount = entities.some(e => e.type === 'amount');
      const hasDate = entities.some(e => e.type === 'date');
      if (!hasAmount && !hasDate) return true;
    }

    return false;
  }

  public manageConversationFlow(
    parsedQuery: ParsedQuery,
    currentFlow?: ConversationFlow
  ): ConversationFlow {
    // Initialize or update conversation flow
    if (!currentFlow) {
      return this.initializeFlow(parsedQuery);
    }

    return this.updateFlow(currentFlow, parsedQuery);
  }

  private initializeFlow(parsedQuery: ParsedQuery): ConversationFlow {
    const { intent } = parsedQuery;
    
    let requiredInfo: string[] = [];
    let nextSteps: string[] = [];

    // Define required information based on domain and intent
    switch (intent.domain) {
      case 'financial':
        requiredInfo = ['goal', 'timeline', 'budget', 'risk_tolerance'];
        nextSteps = ['gather_financial_data', 'analyze_situation', 'provide_recommendations'];
        break;
      case 'career':
        requiredInfo = ['current_role', 'goals', 'timeline', 'skills'];
        nextSteps = ['assess_current_situation', 'identify_opportunities', 'create_action_plan'];
        break;
      case 'emotional':
        requiredInfo = ['current_feelings', 'triggers', 'duration', 'support_system'];
        nextSteps = ['understand_situation', 'provide_coping_strategies', 'suggest_resources'];
        break;
      default:
        requiredInfo = ['clarify_domain', 'understand_goal'];
        nextSteps = ['gather_context', 'provide_guidance'];
    }

    return {
      currentStep: 'initial_assessment',
      nextSteps,
      requiredInfo,
      collectedInfo: {},
      isComplete: false
    };
  }

  private updateFlow(currentFlow: ConversationFlow, parsedQuery: ParsedQuery): ConversationFlow {
    const updatedFlow = { ...currentFlow };
    
    // Extract information from the parsed query
    const { intent, context } = parsedQuery;
    
    // Update collected information based on entities and keywords
    intent.entities.forEach(entity => {
      switch (entity.type) {
        case 'amount':
          updatedFlow.collectedInfo.budget = entity.value;
          break;
        case 'date':
          updatedFlow.collectedInfo.timeline = entity.value;
          break;
        case 'emotion':
          updatedFlow.collectedInfo.current_feelings = entity.value;
          break;
      }
    });

    // Check if we have enough information to proceed
    const collectedKeys = Object.keys(updatedFlow.collectedInfo);
    const requiredKeys = updatedFlow.requiredInfo;
    const completionRatio = collectedKeys.length / requiredKeys.length;

    if (completionRatio >= 0.7) {
      updatedFlow.isComplete = true;
      updatedFlow.currentStep = 'ready_for_analysis';
    } else {
      // Move to next step in the flow
      const currentStepIndex = updatedFlow.nextSteps.indexOf(updatedFlow.currentStep);
      if (currentStepIndex < updatedFlow.nextSteps.length - 1) {
        updatedFlow.currentStep = updatedFlow.nextSteps[currentStepIndex + 1];
      }
    }

    return updatedFlow;
  }

  public extractContext(messages: ChatMessage[]): Record<string, any> {
    const context: Record<string, any> = {
      topics: new Set<string>(),
      entities: new Map<string, Entity[]>(),
      sentiment: 'neutral',
      urgency: 'normal'
    };

    // Analyze recent messages for context
    const recentMessages = messages.slice(-5); // Last 5 messages
    
    for (const message of recentMessages) {
      const parsed = this.parseQuery(message.content, {
        userId: '',
        sessionId: '',
        previousMessages: []
      });

      // Collect topics
      context.topics.add(parsed.intent.domain);
      
      // Collect entities
      for (const entity of parsed.intent.entities) {
        if (!context.entities.has(entity.type)) {
          context.entities.set(entity.type, []);
        }
        context.entities.get(entity.type)!.push(entity);
      }
    }

    // Convert sets and maps to serializable format
    return {
      topics: Array.from(context.topics),
      entities: Object.fromEntries(context.entities),
      sentiment: context.sentiment,
      urgency: context.urgency
    };
  }
}