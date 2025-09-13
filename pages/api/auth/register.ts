import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../../../lib/security/encryption';
import { AuthService, ROLES, ROLE_PERMISSIONS } from '../../../lib/security/auth';
import { User, UserProfile, UserPreferences, PrivacySettings } from '../../../lib/models/user';

interface RegisterRequest {
  email: string;
  password: string;
  profile?: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
}

interface RegisterResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  token?: string;
  error?: string;
}

// In-memory storage for demo (replace with database in production)
const users = new Map<string, User & { email: string; passwordHash: string; salt: string }>();
const usersByEmail = new Map<string, string>(); // email -> userId mapping

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RegisterResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, password, profile, preferences }: RegisterRequest = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    // Check if user already exists
    if (usersByEmail.has(email.toLowerCase())) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const { hash: passwordHash, salt } = hashPassword(password);

    // Create user ID
    const userId = uuidv4();

    // Create default user profile
    const defaultProfile: UserProfile = {
      demographics: {},
      goals: [],
      values: [],
      riskTolerance: {
        financial: 'moderate',
        career: 'balanced',
        personal: 'moderate'
      },
      communicationStyle: {
        style: 'friendly',
        detail: 'moderate',
        frequency: 'regular',
        channels: ['in-app', 'email']
      },
      ...profile
    };

    // Create default preferences
    const defaultPreferences: UserPreferences = {
      notifications: {
        insights: true,
        alerts: true,
        recommendations: true,
        reminders: true,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00'
        }
      },
      privacy: 'balanced',
      dataRetention: {
        keepHistoryMonths: 12,
        autoDeleteSensitive: false,
        exportBeforeDelete: true
      },
      ui: {
        theme: 'auto',
        language: 'en',
        timezone: 'UTC',
        dashboardLayout: 'default'
      },
      ...preferences
    };

    // Create default privacy settings
    const defaultPrivacySettings: PrivacySettings = {
      dataSharing: {
        allowAnalytics: true,
        allowImprovement: true,
        allowResearch: false,
        thirdPartyIntegrations: true
      },
      visibility: {
        profileVisibility: 'private',
        dataVisibility: {},
        insightSharing: false
      },
      consent: {
        dataCollection: {
          basic: true,
          financial: false,
          health: false,
          social: false
        },
        processing: {
          insights: true,
          recommendations: true,
          patterns: true
        },
        storage: {
          encrypted: true,
          backup: true,
          analytics: true
        },
        lastUpdated: new Date()
      }
    };

    // Create user object
    const user: User & { email: string; passwordHash: string; salt: string } = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      salt,
      profile: defaultProfile,
      preferences: defaultPreferences,
      privacySettings: defaultPrivacySettings,
      connectedSources: [],
      createdAt: new Date(),
      lastActive: new Date()
    };

    // Store user
    users.set(userId, user);
    usersByEmail.set(email.toLowerCase(), userId);

    // Generate JWT token
    const role = ROLES.USER;
    const permissions = ROLE_PERMISSIONS[role];
    
    const token = AuthService.generateToken({
      userId,
      email: email.toLowerCase(),
      role,
      permissions
    });

    // Return success response
    res.status(201).json({
      success: true,
      user: {
        id: userId,
        email: email.toLowerCase(),
        role
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Export users storage for other auth endpoints
export { users, usersByEmail };