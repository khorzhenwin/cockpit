// Tests for MessageInput component
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MessageInput } from '../../../components/chat/MessageInput';

describe('MessageInput Component', () => {
  const mockOnSendMessage = vi.fn();
  const mockOnTyping = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default placeholder', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    expect(screen.getByPlaceholderText('Ask your AI advisor anything...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(
      <MessageInput 
        onSendMessage={mockOnSendMessage} 
        placeholder="Custom placeholder" 
      />
    );
    
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('sends message on form submit', async () => {
    const user = userEvent.setup();
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button');
    
    await user.type(textarea, 'Test message');
    await user.click(submitButton);
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('sends message on Enter key press', async () => {
    const user = userEvent.setup();
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByRole('textbox');
    
    await user.type(textarea, 'Test message');
    await user.keyboard('{Enter}');
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('adds new line on Shift+Enter', async () => {
    const user = userEvent.setup();
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByRole('textbox');
    
    await user.type(textarea, 'Line 1');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(textarea, 'Line 2');
    
    expect(textarea).toHaveValue('Line 1\nLine 2');
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('clears input after sending message', async () => {
    const user = userEvent.setup();
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByRole('textbox');
    
    await user.type(textarea, 'Test message');
    await user.keyboard('{Enter}');
    
    expect(textarea).toHaveValue('');
  });

  it('trims whitespace from messages', async () => {
    const user = userEvent.setup();
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByRole('textbox');
    
    await user.type(textarea, '  Test message  ');
    await user.keyboard('{Enter}');
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('does not send empty messages', async () => {
    const user = userEvent.setup();
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByRole('textbox');
    
    await user.type(textarea, '   ');
    await user.keyboard('{Enter}');
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('disables input when disabled prop is true', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} disabled={true} />);
    
    const textarea = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button');
    
    expect(textarea).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it('calls onTyping when user types', async () => {
    const user = userEvent.setup();
    render(
      <MessageInput 
        onSendMessage={mockOnSendMessage} 
        onTyping={mockOnTyping} 
      />
    );
    
    const textarea = screen.getByRole('textbox');
    
    await user.type(textarea, 'T');
    
    await waitFor(() => {
      expect(mockOnTyping).toHaveBeenCalledWith(true);
    });
  });

  it('stops typing indicator after delay', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    
    render(
      <MessageInput 
        onSendMessage={mockOnSendMessage} 
        onTyping={mockOnTyping} 
      />
    );
    
    const textarea = screen.getByRole('textbox');
    
    await user.type(textarea, 'Test');
    
    // Fast-forward time
    vi.advanceTimersByTime(1100);
    
    await waitFor(() => {
      expect(mockOnTyping).toHaveBeenCalledWith(false);
    });
    
    vi.useRealTimers();
  });

  it('respects maxLength prop', async () => {
    const user = userEvent.setup();
    render(
      <MessageInput 
        onSendMessage={mockOnSendMessage} 
        maxLength={10} 
      />
    );
    
    const textarea = screen.getByRole('textbox');
    
    await user.type(textarea, 'This is a very long message');
    
    expect(textarea).toHaveValue('This is a ');
  });

  it('shows character counter when maxLength is set', () => {
    render(
      <MessageInput 
        onSendMessage={mockOnSendMessage} 
        maxLength={100} 
      />
    );
    
    expect(screen.getByText('0/100')).toBeInTheDocument();
  });

  it('updates character counter as user types', async () => {
    const user = userEvent.setup();
    render(
      <MessageInput 
        onSendMessage={mockOnSendMessage} 
        maxLength={100} 
      />
    );
    
    const textarea = screen.getByRole('textbox');
    
    await user.type(textarea, 'Hello');
    
    expect(screen.getByText('5/100')).toBeInTheDocument();
  });
});