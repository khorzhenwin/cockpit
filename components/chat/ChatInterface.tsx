// Main chat interface component
import React, { useState, useCallback, useEffect } from 'react';
import { ChatMessage, ChatState, ConversationHistory } from '../../lib/models/chat';
import { useWebSocket } from '../../lib/hooks/useWebSocket';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface ChatInterfaceProps {
  userId: string;
  sessionId?: string;
  initialMessages?: ChatMessage[];
  onMessageSent?: (message: ChatMessage) => void;
  onMessageReceived?: (message: ChatMessage) => void;
  className?: string;
  showMetadata?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  userId,
  sessionId = 'default',
  initialMessages = [],
  onMessageSent,
  onMessageReceived,
  className = '',
  showMetadata = false
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [chatState, setChatState] = useState<ChatState>({
    isConnected: false,
    isLoading: false,
    typingIndicator: { isTyping: false }
  });
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory>({
    messages: [],
    totalCount: 0,
    hasMore: false
  });

  // WebSocket connection
  const { isConnected, sendMessage, sendTyping } = useWebSocket({
    userId,
    sessionId,
    onMessage: handleMessageReceived,
    onTyping: handleTypingReceived,
    onError: handleError
  });

  function handleMessageReceived(message: ChatMessage) {
    setMessages(prev => [...prev, message]);
    onMessageReceived?.(message);
    
    // Clear typing indicator when message is received
    setChatState(prev => ({
      ...prev,
      typingIndicator: { isTyping: false }
    }));
  }

  function handleTypingReceived(typing: any) {
    setChatState(prev => ({
      ...prev,
      typingIndicator: typing
    }));
  }

  function handleError(error: string) {
    setChatState(prev => ({
      ...prev,
      error
    }));
  }

  // Update connection state
  useEffect(() => {
    setChatState(prev => ({
      ...prev,
      isConnected
    }));
  }, [isConnected]);

  const handleSendMessage = useCallback((content: string) => {
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      type: 'user',
      timestamp: new Date()
    };

    // Add message to local state immediately
    setMessages(prev => [...prev, message]);
    onMessageSent?.(message);

    // Send via WebSocket
    sendMessage(content);

    // Set loading state
    setChatState(prev => ({
      ...prev,
      isLoading: true
    }));
  }, [sendMessage, onMessageSent]);

  const handleTyping = useCallback((isTyping: boolean) => {
    sendTyping(isTyping);
  }, [sendTyping]);

  const handleLoadMore = useCallback(async () => {
    // TODO: Implement message history loading from API
    // This would typically fetch older messages from the server
    console.log('Loading more messages...');
  }, []);

  const connectionStatus = () => {
    if (!chatState.isConnected) {
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 text-sm">
          ⚠️ Disconnected - Attempting to reconnect...
        </div>
      );
    }
    return null;
  };

  const errorDisplay = () => {
    if (!chatState.error) return null;
    
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 text-sm">
        Error: {chatState.error}
        <button 
          onClick={() => setChatState(prev => ({ ...prev, error: undefined }))}
          className="ml-2 text-red-800 hover:text-red-900"
        >
          ✕
        </button>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="border-b bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">AI Life Advisor</h2>
            <p className="text-sm text-gray-600">
              Your personal assistant for life decisions
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${chatState.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">
              {chatState.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Connection status */}
      {connectionStatus()}
      
      {/* Error display */}
      {errorDisplay()}

      {/* Messages */}
      <div className="flex-1 relative">
        <MessageList
          messages={messages}
          currentUserId={userId}
          isTyping={chatState.typingIndicator.isTyping}
          typingMessage={chatState.typingIndicator.message}
          onLoadMore={handleLoadMore}
          hasMore={conversationHistory.hasMore}
          isLoading={chatState.isLoading}
          showMetadata={showMetadata}
        />
      </div>

      {/* Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        disabled={!chatState.isConnected}
        placeholder={
          chatState.isConnected 
            ? "Ask about your finances, career, health, or any life decisions..."
            : "Connecting..."
        }
      />
    </div>
  );
};