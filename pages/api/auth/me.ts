import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/security/auth';
import { users } from './register';

interface MeResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    profile: any;
    preferences: any;
    privacySettings: any;
    connectedSources: any[];
    createdAt: string;
    lastActive: string;
  };
  error?: string;
}

export default function handler(
  req: NextApiRequest & { user?: any },
  res: NextApiResponse<MeResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Apply authentication middleware
  const authMiddleware = requireAuth();
  const authResult = authMiddleware(req, res);
  
  // If auth middleware returned a response, it means authentication failed
  if (authResult) {
    return authResult;
  }

  try {
    const userId = req.user.id;
    const user = users.get(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Return user data (excluding sensitive information)
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: req.user.role,
        profile: user.profile,
        preferences: user.preferences,
        privacySettings: user.privacySettings,
        connectedSources: user.connectedSources,
        createdAt: user.createdAt.toISOString(),
        lastActive: user.lastActive.toISOString()
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}