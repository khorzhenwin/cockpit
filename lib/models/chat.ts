// Chat-related types and interfaces

export interface ChatMessage {
  id: string;
  content: string;
  type: 'user' | 'assistant' | 'system';
  timestamp: Date;
  metadata?: {
    confidence?: number;
    reasoning?: string;
    followUpQuestions?: string[];
    relatedInsights?: string[];
  };
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  messages: ChatMessage[];
  currentTopic?: string;
  lastActivity: Date;
}

export interface TypingIndicator {
  isTyping: boolean;
  userId?: string;
  message?: string;
}

export interface ChatState {
  isConnected: boolean;
  isLoading: boolean;
  typingIndicator: TypingIndicator;
  error?: string;
}

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'error' | 'connection_status';
  payload: any;
  timestamp: Date;
}

export interface MessageDisplayProps {
  message: ChatMessage;
  isOwn: boolean;
  showTimestamp?: boolean;
  showMetadata?: boolean;
}

export interface ChatInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export interface ConversationHistory {
  messages: ChatMessage[];
  totalCount: number;
  hasMore: boolean;
}