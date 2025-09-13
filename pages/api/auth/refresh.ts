import { NextApiRequest, NextApiResponse } from 'next';
import { AuthService, SessionManager } from '../../../lib/security/auth';

interface RefreshResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RefreshResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { token: oldToken } = req.body;
    const sessionId = req.cookies.sessionId;

    // Try to refresh using token
    if (oldToken) {
      try {
        const newToken = AuthService.refreshToken(oldToken);
        
        return res.status(200).json({
          success: true,
          token: newToken
        });
      } catch (error) {
        // Token refresh failed, try session-based refresh
        console.log('Token refresh failed, trying session-based refresh');
      }
    }

    // Try session-based refresh
    if (sessionId) {
      const session = SessionManager.getSession(sessionId);
      
      if (session) {
        // Generate new token from session data
        const newToken = AuthService.generateToken({
          userId: session.userId,
          email: session.email,
          role: session.role,
          permissions: session.permissions
        });

        return res.status(200).json({
          success: true,
          token: newToken
        });
      }
    }

    // Both token and session refresh failed
    res.status(401).json({
      success: false,
      error: 'Unable to refresh authentication'
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
}