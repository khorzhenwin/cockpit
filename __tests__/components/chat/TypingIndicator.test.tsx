// Tests for TypingIndicator component
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TypingIndicator } from '../../../components/chat/TypingIndicator';

describe('TypingIndicator Component', () => {
  it('renders when visible', () => {
    render(<TypingIndicator isVisible={true} />);
    
    expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<TypingIndicator isVisible={false} />);
    
    expect(screen.queryByText('AI is thinking...')).not.toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<TypingIndicator isVisible={true} message="Custom typing message" />);
    
    expect(screen.getByText('Custom typing message')).toBeInTheDocument();
  });

  it('renders animated dots', () => {
    const { container } = render(<TypingIndicator isVisible={true} />);
    
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots).toHaveLength(3);
  });

  it('applies correct styling', () => {
    const { container } = render(<TypingIndicator isVisible={true} />);
    
    const bubble = container.querySelector('.bg-gray-200');
    expect(bubble).toBeInTheDocument();
    expect(bubble).toHaveClass('rounded-bl-none');
  });
});