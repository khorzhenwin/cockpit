import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/security/auth';
import { users } from '../auth/register';
import { PrivacySettings } from '../../../lib/models/user';

interface UpdatePrivacyRequest {
  dataSharing?: {
    allowAnalytics?: boolean;
    allowImprovement?: boolean;
    allowResearch?: boolean;
    thirdPartyIntegrations?: boolean;
  };
  visibility?: {
    profileVisibility?: 'private' | 'limited' | 'public';
    dataVisibility?: Record<string, boolean>;
    insightSharing?: boolean;
  };
  consent?: {
    dataCollection?: Record<string, boolean>;
    processing?: Record<string, boolean>;
    storage?: Record<string, boolean>;
  };
}

interface UpdatePrivacyResponse {
  success: boolean;
  privacySettings?: PrivacySettings;
  error?: string;
}

export default function handler(
  req: NextApiRequest & { user?: any },
  res: NextApiResponse<UpdatePrivacyResponse>
) {
  if (req.method !== 'PUT') {
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
    const updates: UpdatePrivacyRequest = req.body;

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update privacy settings
    if (updates.dataSharing) {
      user.privacySettings.dataSharing = {
        ...user.privacySettings.dataSharing,
        ...updates.dataSharing
      };
    }

    if (updates.visibility) {
      user.privacySettings.visibility = {
        ...user.privacySettings.visibility,
        ...updates.visibility,
        dataVisibility: {
          ...user.privacySettings.visibility.dataVisibility,
          ...updates.visibility.dataVisibility
        }
      };
    }

    if (updates.consent) {
      user.privacySettings.consent = {
        ...user.privacySettings.consent,
        ...updates.consent,
        dataCollection: {
          ...user.privacySettings.consent.dataCollection,
          ...updates.consent.dataCollection
        },
        processing: {
          ...user.privacySettings.consent.processing,
          ...updates.consent.processing
        },
        storage: {
          ...user.privacySettings.consent.storage,
          ...updates.consent.storage
        },
        lastUpdated: new Date()
      };
    }

    // Update last active timestamp
    user.lastActive = new Date();

    // Save updated user
    users.set(userId, user);

    res.status(200).json({
      success: true,
      privacySettings: user.privacySettings
    });

  } catch (error) {
    console.error('Update privacy settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

