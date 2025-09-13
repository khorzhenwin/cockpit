// Socket.IO hook for real-time chat communication
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ChatMessage, TypingIndicator } from '../models/chat';

interface UseWebSocketOptions {
  userId: string;
  sessionId: string;
  onMessage?: (message: ChatMessage) => void;
  onTyping?: (typing: TypingIndicator) => void;
  onError?: (error: string) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  sendMessage: (content: string) => void;
  sendTyping: (isTyping: boolean) => void;
  disconnect: () => void;
  reconnect: () => void;
}

export const useWebSocket = (options: UseWebSocketOptions): UseWebSocketReturn => {
  const {
    userId,
    sessionId,
    onMessage,
    onTyping,
    onError
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    try {
      const socket = io({
        path: '/api/chat/websocket',
        transports: ['websocket', 'polling']
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        console.log('Socket.IO connected');
        
        // Join the chat session
        socket.emit('join', { userId, sessionId });
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        console.log('Socket.IO disconnected');
      });

      socket.on('message', (message: ChatMessage) => {
        onMessage?.(message);
      });

      socket.on('typing', (typing: TypingIndicator) => {
        onTyping?.(typing);
      });

      socket.on('error', (error: string) => {
        console.error('Socket.IO error:', error);
        onError?.(error);
      });

      socket.on('connection_status', (status: { connected: boolean }) => {
        console.log('Connection status:', status);
      });

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        onError?.('Failed to connect to chat server');
      });

    } catch (error) {
      console.error('Failed to create Socket.IO connection:', error);
      onError?.('Failed to establish connection');
    }
  }, [userId, sessionId, onMessage, onTyping, onError]);

  const sendMessage = useCallback((content: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('message', { content });
    } else {
      onError?.('Not connected. Message not sent.');
    }
  }, [onError]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', { isTyping });
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [disconnect, connect]);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    sendMessage,
    sendTyping,
    disconnect,
    reconnect
  };
};