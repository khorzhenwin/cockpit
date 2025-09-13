import { NextApiRequest, NextApiResponse } from 'next';
import { SessionManager } from '../../../lib/security/auth';

interface LogoutResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LogoutResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get session ID from cookie or body
    const sessionId = req.cookies.sessionId || req.body.sessionId;

    if (sessionId) {
      // Destroy session
      const destroyed = SessionManager.destroySession(sessionId);
      
      if (destroyed) {
        console.log(`Session ${sessionId} destroyed successfully`);
      } else {
        console.log(`Session ${sessionId} not found or already destroyed`);
      }
    }

    // Clear session cookie
    res.setHeader('Set-Cookie', [
      'sessionId=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
    ]);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}