// Individual chat message component
import React from 'react';
import { ChatMessage } from '../../lib/models/chat';

interface MessageProps {
  message: ChatMessage;
  isOwn: boolean;
  showTimestamp?: boolean;
  showMetadata?: boolean;
}

export const Message: React.FC<MessageProps> = ({
  message,
  isOwn,
  showTimestamp = true,
  showMetadata = false
}) => {
  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(timestamp));
  };

  const messageClasses = `
    flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4
  `;

  const bubbleClasses = `
    max-w-xs lg:max-w-md px-4 py-2 rounded-lg
    ${isOwn 
      ? 'bg-blue-500 text-white rounded-br-none' 
      : 'bg-gray-200 text-gray-800 rounded-bl-none'
    }
  `;

  const renderMetadata = () => {
    if (!showMetadata || !message.metadata) return null;

    return (
      <div className="mt-2 text-xs opacity-75">
        {message.metadata.confidence && (
          <div>Confidence: {Math.round(message.metadata.confidence * 100)}%</div>
        )}
        {message.metadata.reasoning && (
          <div className="mt-1 italic">Reasoning: {message.metadata.reasoning}</div>
        )}
        {message.metadata.followUpQuestions && message.metadata.followUpQuestions.length > 0 && (
          <div className="mt-2">
            <div className="font-semibold">Follow-up questions:</div>
            <ul className="list-disc list-inside">
              {message.metadata.followUpQuestions.map((question, index) => (
                <li key={index} className="cursor-pointer hover:underline">
                  {question}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={messageClasses}>
      <div className="flex flex-col">
        <div className={bubbleClasses}>
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
          {renderMetadata()}
        </div>
        {showTimestamp && (
          <div className={`text-xs text-gray-500 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
            {formatTime(message.timestamp)}
          </div>
        )}
      </div>
    </div>
  );
};