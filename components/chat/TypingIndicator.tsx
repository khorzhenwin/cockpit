// Typing indicator component
import React from 'react';

interface TypingIndicatorProps {
  isVisible: boolean;
  message?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  isVisible,
  message = "AI is thinking..."
}) => {
  if (!isVisible) return null;

  return (
    <div className="flex justify-start mb-4">
      <div className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg rounded-bl-none max-w-xs">
        <div className="flex items-center space-x-1">
          <span className="text-sm">{message}</span>
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};