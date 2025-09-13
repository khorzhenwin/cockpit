// WebSocket API endpoint for real-time chat
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { ChatMessage, WebSocketMessage } from '../../../lib/models/chat';
import { ConversationManager } from '../../../lib/services/conversationManager';

interface ExtendedNextApiResponse extends NextApiResponse {
  socket: {
    server: HTTPServer & {
      io?: SocketIOServer;
    };
  };
}

interface SocketData {
  userId: string;
  sessionId: string;
}

// Global conversation manager instance
let conversationManager: ConversationManager;

export default function handler(req: NextApiRequest, res: ExtendedNextApiResponse) {
  if (!res.socket.server.io) {
    console.log('Setting up Socket.IO server...');
    
    // Initialize conversation manager
    if (!conversationManager) {
      conversationManager = new ConversationManager();
    }
    
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/chat/websocket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Handle user joining a chat session
      socket.on('join', async (data: { userId: string; sessionId: string }) => {
        const { userId, sessionId } = data;
        const roomId = `chat_${userId}_${sessionId}`;
        
        socket.join(roomId);
        socket.data = { userId, sessionId };
        
        console.log(`User ${userId} joined session ${sessionId}`);
        
        // Start or resume conversation session
        try {
          await conversationManager.startSession(userId, sessionId);
          console.log(`Conversation session started for user ${userId}`);
        } catch (error) {
          console.error('Error starting conversation session:', error);
        }
        
        // Send connection confirmation
        socket.emit('connection_status', { connected: true });
      });

      // Handle incoming messages
      socket.on('message', async (data: { content: string }) => {
        try {
          const socketData = socket.data as SocketData;
          if (!socketData) {
            socket.emit('error', 'Not authenticated');
            return;
          }

          const { userId, sessionId } = socketData;
          const roomId = `chat_${userId}_${sessionId}`;

          // Create user message
          const userMessage: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content: data.content,
            type: 'user',
            timestamp: new Date()
          };

          // Broadcast user message to room
          io.to(roomId).emit('message', userMessage);

          // Show typing indicator
          socket.to(roomId).emit('typing', { isTyping: true, message: 'AI is analyzing your message...' });

          try {
            // Process message through conversation manager
            const response = await conversationManager.processMessage(sessionId, userMessage);
            
            // Create AI response message
            const aiMessage: ChatMessage = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              content: response.message,
              type: 'assistant',
              timestamp: new Date(),
              metadata: {
                confidence: response.confidence,
                reasoning: `Based on ${response.metadata.intent} intent in ${response.metadata.domain} domain`,
                followUpQuestions: response.followUpQuestions,
                relatedInsights: response.suggestions
              }
            };

            // Stop typing indicator
            io.to(roomId).emit('typing', { isTyping: false });
            
            // Send AI response
            io.to(roomId).emit('message', aiMessage);
            
            // Send suggestions if available
            if (response.suggestions.length > 0) {
              socket.emit('suggestions', response.suggestions);
            }
            
          } catch (error) {
            console.error('Error processing message with conversation manager:', error);
            
            // Fallback to simple response
            const fallbackResponse = await generateFallbackResponse(data.content, userId);
            
            const aiMessage: ChatMessage = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              content: fallbackResponse.content,
              type: 'assistant',
              timestamp: new Date(),
              metadata: fallbackResponse.metadata
            };

            io.to(roomId).emit('typing', { isTyping: false });
            io.to(roomId).emit('message', aiMessage);
          }

        } catch (error) {
          console.error('Error handling message:', error);
          socket.emit('error', 'Failed to process message');
        }
      });

      // Handle typing indicators
      socket.on('typing', (data: { isTyping: boolean }) => {
        const socketData = socket.data as SocketData;
        if (!socketData) return;

        const { userId, sessionId } = socketData;
        const roomId = `chat_${userId}_${sessionId}`;
        
        // Broadcast typing status to other users in the room
        socket.to(roomId).emit('typing', {
          isTyping: data.isTyping,
          userId
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    res.socket.server.io = io;
  }

  res.end();
}

// Fallback response generator when conversation manager fails
async function generateFallbackResponse(userMessage: string, userId: string) {
  const responses = [
    {
      content: "I understand you're asking about " + userMessage.toLowerCase() + ". I'm here to help you with various aspects of your life. Could you provide a bit more context about what you're looking for?",
      metadata: {
        confidence: 0.6,
        reasoning: "Fallback response due to processing error",
        followUpQuestions: [
          "What specific area would you like to focus on?",
          "Is this related to finances, career, health, or relationships?"
        ]
      }
    },
    {
      content: "I want to make sure I give you the best advice possible. Could you tell me more about your situation so I can provide more personalized guidance?",
      metadata: {
        confidence: 0.6,
        reasoning: "Fallback response - requesting more context",
        followUpQuestions: [
          "What's your main concern right now?",
          "What outcome are you hoping to achieve?"
        ]
      }
    }
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

export const config = {
  api: {
    bodyParser: false,
  },
};