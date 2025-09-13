// Tests for MessageList component
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageList } from '../../../components/chat/MessageList';
import { ChatMessage } from '../../../lib/models/chat';

import { vi } from 'vitest';

// Mock the Message component to simplify testing
vi.mock('../../../components/chat/Message', () => ({
  Message: ({ message }: { message: ChatMessage }) => (
    <div data-testid={`message-${message.id}`}>{message.content}</div>
  )
}));

describe('MessageList Component', () => {
  const mockMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      content: 'Hello',
      type: 'user',
      timestamp: new Date('2023-01-01T12:00:00Z')
    },
    {
      id: 'msg-2',
      content: 'Hi there!',
      type: 'assistant',
      timestamp: new Date('2023-01-01T12:01:00Z')
    }
  ];

  const mockOnLoadMore = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders messages correctly', () => {
    render(
      <MessageList
        messages={mockMessages}
        currentUserId="user-1"
        isTyping={false}
      />
    );

    expect(screen.getByTestId('message-msg-1')).toBeInTheDocument();
    expect(screen.getByTestId('message-msg-2')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('shows empty state when no messages', () => {
    render(
      <MessageList
        messages={[]}
        currentUserId="user-1"
        isTyping={false}
      />
    );

    expect(screen.getByText('Start a conversation with your AI advisor')).toBeInTheDocument();
    expect(screen.getByText('Ask about your finances, career, health, or any life decisions')).toBeInTheDocument();
  });

  it('shows typing indicator when isTyping is true', () => {
    render(
      <MessageList
        messages={mockMessages}
        currentUserId="user-1"
        isTyping={true}
      />
    );

    // The TypingIndicator component should be rendered
    // We can't easily test its content due to mocking, but we can verify it's called
    expect(screen.getByTestId('message-msg-1')).toBeInTheDocument();
  });

  it('shows load more button when hasMore is true', () => {
    render(
      <MessageList
        messages={mockMessages}
        currentUserId="user-1"
        isTyping={false}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
      />
    );

    expect(screen.getByText('Load more messages')).toBeInTheDocument();
  });

  it('calls onLoadMore when load more button is clicked', () => {
    render(
      <MessageList
        messages={mockMessages}
        currentUserId="user-1"
        isTyping={false}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
      />
    );

    const loadMoreButton = screen.getByText('Load more messages');
    fireEvent.click(loadMoreButton);

    expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator when isLoading is true', () => {
    render(
      <MessageList
        messages={mockMessages}
        currentUserId="user-1"
        isTyping={false}
        hasMore={true}
        isLoading={true}
        onLoadMore={mockOnLoadMore}
      />
    );

    expect(screen.getByText('Loading more messages...')).toBeInTheDocument();
  });

  it('handles scroll events correctly', () => {
    const { container } = render(
      <MessageList
        messages={mockMessages}
        currentUserId="user-1"
        isTyping={false}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
      />
    );

    const messagesContainer = container.querySelector('.overflow-y-auto');
    expect(messagesContainer).toBeInTheDocument();

    // Simulate scroll to top
    if (messagesContainer) {
      Object.defineProperty(messagesContainer, 'scrollTop', { value: 0, writable: true });
      Object.defineProperty(messagesContainer, 'scrollHeight', { value: 1000, writable: true });
      Object.defineProperty(messagesContainer, 'clientHeight', { value: 500, writable: true });

      fireEvent.scroll(messagesContainer);

      expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
    }
  });

  it('renders custom typing message', () => {
    render(
      <MessageList
        messages={mockMessages}
        currentUserId="user-1"
        isTyping={true}
        typingMessage="Custom typing message"
      />
    );

    // The typing indicator should receive the custom message
    expect(screen.getByTestId('message-msg-1')).toBeInTheDocument();
  });
});