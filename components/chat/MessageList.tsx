// Message list component with scrolling and history
import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, ConversationHistory } from '../../lib/models/chat';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  isTyping: boolean;
  typingMessage?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  showMetadata?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isTyping,
  typingMessage,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  showMetadata = false
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, shouldAutoScroll]);

  // Handle scroll events to determine if user is at bottom
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100; // 100px threshold
    setShouldAutoScroll(isAtBottom);

    // Load more messages when scrolled to top
    if (scrollTop === 0 && hasMore && !isLoading && onLoadMore) {
      onLoadMore();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShouldAutoScroll(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Load more indicator */}
      {hasMore && (
        <div className="text-center py-2">
          {isLoading ? (
            <div className="text-gray-500">Loading more messages...</div>
          ) : (
            <button
              onClick={onLoadMore}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              Load more messages
            </button>
          )}
        </div>
      )}

      {/* Messages container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-2"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-lg mb-2">👋</div>
              <div>Start a conversation with your AI advisor</div>
              <div className="text-sm mt-1">Ask about your finances, career, health, or any life decisions</div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <Message
                key={message.id}
                message={message}
                isOwn={message.type === 'user'}
                showTimestamp={true}
                showMetadata={showMetadata && message.type === 'assistant'}
              />
            ))}
            
            <TypingIndicator 
              isVisible={isTyping} 
              message={typingMessage}
            />
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {!shouldAutoScroll && (
        <div className="absolute bottom-20 right-4">
          <button
            onClick={scrollToBottom}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 shadow-lg transition-colors"
            aria-label="Scroll to bottom"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};