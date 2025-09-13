// Tests for ChatInterface component
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '../../../components/chat/ChatInterface';
import { ChatMessage } from '../../../lib/models/chat';

import { vi } from 'vitest';

// Mock the useWebSocket hook
const mockSendMessage = vi.fn();
const mockSendTyping = vi.fn();
const mockDisconnect = vi.fn();
const mockReconnect = vi.fn();
const mockUseWebSocket = vi.fn(() => ({
  isConnected: true,
  sendMessage: mockSendMessage,
  sendTyping: mockSendTyping,
  disconnect: mockDisconnect,
  reconnect: mockReconnect
}));

vi.mock('../../../lib/hooks/useWebSocket', () => ({
  useWebSocket: mockUseWebSocket
}));

// Mock child components
vi.mock('../../../components/chat/MessageList', () => ({
  MessageList: ({ messages, isTyping, onLoadMore }: any) => (
    <div data-testid="message-list">
      <div data-testid="message-count">{messages.length}</div>
      <div data-testid="typing-status">{isTyping ? 'typing' : 'not-typing'}</div>
      {onLoadMore && (
        <button onClick={onLoadMore} data-testid="load-more">
          Load More
        </button>
      )}
    </div>
  )
}));

vi.mock('../../../components/chat/MessageInput', () => ({
  MessageInput: ({ onSendMessage, onTyping, disabled }: any) => (
    <div data-testid="message-input">
      <input
        data-testid="input-field"
        disabled={disabled}
        onChange={(e) => onTyping?.(e.target.value.length > 0)}
      />
      <button
        data-testid="send-button"
        onClick={() => onSendMessage('test message')}
        disabled={disabled}
      >
        Send
      </button>
    </div>
  )
}));

describe('ChatInterface Component', () => {
  const defaultProps = {
    userId: 'user-1',
    sessionId: 'session-1'
  };

  const mockOnMessageSent = vi.fn();
  const mockOnMessageReceived = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders chat interface correctly', () => {
    render(<ChatInterface {...defaultProps} />);

    expect(screen.getByText('AI Life Advisor')).toBeInTheDocument();
    expect(screen.getByText('Your personal assistant for life decisions')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
  });

  it('shows connection status correctly', () => {
    mockUseWebSocket.mockReturnValue({
      isConnected: false,
      sendMessage: mockSendMessage,
      sendTyping: mockSendTyping,
      disconnect: mockDisconnect,
      reconnect: mockReconnect
    });

    render(<ChatInterface {...defaultProps} />);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('displays initial messages', () => {
    const initialMessages: ChatMessage[] = [
      {
        id: 'msg-1',
        content: 'Hello',
        type: 'user',
        timestamp: new Date()
      }
    ];

    render(<ChatInterface {...defaultProps} initialMessages={initialMessages} />);

    expect(screen.getByTestId('message-count')).toHaveTextContent('1');
  });

  it('sends message when user submits', async () => {
    render(<ChatInterface {...defaultProps} onMessageSent={mockOnMessageSent} />);

    const sendButton = screen.getByTestId('send-button');
    fireEvent.click(sendButton);

    expect(mockSendMessage).toHaveBeenCalledWith('test message');
    expect(mockOnMessageSent).toHaveBeenCalled();
  });

  it('handles typing events', async () => {
    render(<ChatInterface {...defaultProps} />);

    const inputField = screen.getByTestId('input-field');
    fireEvent.change(inputField, { target: { value: 'typing...' } });

    expect(mockSendTyping).toHaveBeenCalledWith(true);
  });

  it('disables input when disconnected', () => {
    mockUseWebSocket.mockReturnValue({
      isConnected: false,
      sendMessage: mockSendMessage,
      sendTyping: mockSendTyping,
      disconnect: mockDisconnect,
      reconnect: mockReconnect
    });

    render(<ChatInterface {...defaultProps} />);

    const inputField = screen.getByTestId('input-field');
    const sendButton = screen.getByTestId('send-button');

    expect(inputField).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('shows disconnection warning when not connected', () => {
    mockUseWebSocket.mockReturnValue({
      isConnected: false,
      sendMessage: mockSendMessage,
      sendTyping: mockSendTyping,
      disconnect: mockDisconnect,
      reconnect: mockReconnect
    });

    render(<ChatInterface {...defaultProps} />);

    expect(screen.getByText(/Disconnected - Attempting to reconnect/)).toBeInTheDocument();
  });

  it('handles load more messages', () => {
    render(<ChatInterface {...defaultProps} />);

    const loadMoreButton = screen.getByTestId('load-more');
    fireEvent.click(loadMoreButton);

    // Should not throw error (actual implementation would load more messages)
    expect(loadMoreButton).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ChatInterface {...defaultProps} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('calls onMessageReceived when message is received', () => {
    let onMessageCallback: (message: ChatMessage) => void;

    mockUseWebSocket.mockImplementation(({ onMessage }: any) => {
      onMessageCallback = onMessage;
      return {
        isConnected: true,
        sendMessage: mockSendMessage,
        sendTyping: mockSendTyping,
        disconnect: mockDisconnect,
        reconnect: mockReconnect
      };
    });

    render(<ChatInterface {...defaultProps} onMessageReceived={mockOnMessageReceived} />);

    const testMessage: ChatMessage = {
      id: 'msg-1',
      content: 'Test message',
      type: 'assistant',
      timestamp: new Date()
    };

    onMessageCallback!(testMessage);

    expect(mockOnMessageReceived).toHaveBeenCalledWith(testMessage);
  });
});