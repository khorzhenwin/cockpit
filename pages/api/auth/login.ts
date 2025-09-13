import { NextApiRequest, NextApiResponse } from 'next';
import { verifyPassword } from '../../../lib/security/encryption';
import { AuthService, ROLE_PERMISSIONS, SessionManager } from '../../../lib/security/auth';
import { users, usersByEmail } from './register';

interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    profile: any;
  };
  token?: string;
  sessionId?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoginResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, password, rememberMe }: LoginRequest = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user by email
    const userId = usersByEmail.get(email.toLowerCase());
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const user = users.get(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Verify password
    const isValidPassword = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Update last active timestamp
    user.lastActive = new Date();
    users.set(userId, user);

    // Get user role and permissions
    const role = 'user'; // Default role, could be stored in user object
    const permissions = ROLE_PERMISSIONS[role] || [];

    // Generate JWT token with extended expiry if rememberMe is true
    const tokenPayload = {
      userId,
      email: user.email,
      role,
      permissions
    };

    // Override token expiry for remember me
    const originalExpiresIn = process.env.JWT_EXPIRES_IN;
    if (rememberMe) {
      process.env.JWT_EXPIRES_IN = '30d'; // 30 days for remember me
    }

    const token = AuthService.generateToken(tokenPayload);

    // Restore original expiry
    if (rememberMe && originalExpiresIn) {
      process.env.JWT_EXPIRES_IN = originalExpiresIn;
    }

    // Create session
    const sessionId = `session_${userId}_${Date.now()}`;
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    SessionManager.createSession(sessionId, {
      userId,
      email: user.email,
      role,
      permissions,
      lastActivity: new Date(),
      ipAddress: Array.isArray(clientIP) ? clientIP[0] : clientIP,
      userAgent: userAgent || 'Unknown'
    });

    // Set session cookie
    res.setHeader('Set-Cookie', [
      `sessionId=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60}` // 30 days or 1 day
    ]);

    // Return success response
    res.status(200).json({
      success: true,
      user: {
        id: userId,
        email: user.email,
        role,
        profile: user.profile
      },
      token,
      sessionId
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}