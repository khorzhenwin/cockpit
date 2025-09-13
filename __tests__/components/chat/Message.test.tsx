// Tests for Message component
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Message } from '../../../components/chat/Message';
import { ChatMessage } from '../../../lib/models/chat';

describe('Message Component', () => {
  const mockMessage: ChatMessage = {
    id: 'test-message-1',
    content: 'Hello, this is a test message',
    type: 'user',
    timestamp: new Date('2023-01-01T12:00:00Z')
  };

  it('renders user message correctly', () => {
    render(<Message message={mockMessage} isOwn={true} />);
    
    expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
    // Check for time format without specific timezone assumption
    expect(screen.getByText(/\d{1,2}:\d{2} (AM|PM)/)).toBeInTheDocument();
  });

  it('renders assistant message correctly', () => {
    const assistantMessage: ChatMessage = {
      ...mockMessage,
      type: 'assistant',
      content: 'This is an AI response'
    };

    render(<Message message={assistantMessage} isOwn={false} />);
    
    expect(screen.getByText('This is an AI response')).toBeInTheDocument();
  });

  it('displays metadata when showMetadata is true', () => {
    const messageWithMetadata: ChatMessage = {
      ...mockMessage,
      type: 'assistant',
      metadata: {
        confidence: 0.85,
        reasoning: 'Based on your recent patterns',
        followUpQuestions: ['Would you like more details?', 'Any other concerns?']
      }
    };

    render(<Message message={messageWithMetadata} isOwn={false} showMetadata={true} />);
    
    expect(screen.getByText('Confidence: 85%')).toBeInTheDocument();
    expect(screen.getByText('Reasoning: Based on your recent patterns')).toBeInTheDocument();
    expect(screen.getByText('Follow-up questions:')).toBeInTheDocument();
    expect(screen.getByText('Would you like more details?')).toBeInTheDocument();
    expect(screen.getByText('Any other concerns?')).toBeInTheDocument();
  });

  it('hides timestamp when showTimestamp is false', () => {
    render(<Message message={mockMessage} isOwn={true} showTimestamp={false} />);
    
    expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
    expect(screen.queryByText(/\d{1,2}:\d{2} (AM|PM)/)).not.toBeInTheDocument();
  });

  it('applies correct styling for own messages', () => {
    const { container } = render(<Message message={mockMessage} isOwn={true} />);
    
    const messageContainer = container.querySelector('.justify-end');
    expect(messageContainer).toBeInTheDocument();
  });

  it('applies correct styling for other messages', () => {
    const { container } = render(<Message message={mockMessage} isOwn={false} />);
    
    const messageContainer = container.querySelector('.justify-start');
    expect(messageContainer).toBeInTheDocument();
  });

  it('handles multiline content correctly', () => {
    const multilineMessage: ChatMessage = {
      ...mockMessage,
      content: 'Line 1\nLine 2\nLine 3'
    };

    render(<Message message={multilineMessage} isOwn={true} />);
    
    // Check that the content is rendered with proper whitespace handling
    const contentElement = screen.getByText((content, element) => {
      return element?.textContent === 'Line 1\nLine 2\nLine 3';
    });
    expect(contentElement).toBeInTheDocument();
  });
});