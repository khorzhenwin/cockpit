import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/security/auth';
import { users } from '../auth/register';
import { UserProfile, UserPreferences, PrivacySettings } from '../../../lib/models/user';

interface UpdateProfileRequest {
  profile?: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
  privacySettings?: Partial<PrivacySettings>;
}

interface UpdateProfileResponse {
  success: boolean;
  user?: {
    id: string;
    profile: UserProfile;
    preferences: UserPreferences;
    privacySettings: PrivacySettings;
  };
  error?: string;
}

export default function handler(
  req: NextApiRequest & { user?: any },
  res: NextApiResponse<UpdateProfileResponse>
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
    const { profile, preferences, privacySettings }: UpdateProfileRequest = req.body;

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update profile if provided
    if (profile) {
      user.profile = {
        ...user.profile,
        ...profile,
        // Merge nested objects properly
        demographics: {
          ...user.profile.demographics,
          ...profile.demographics
        },
        goals: profile.goals || user.profile.goals,
        values: profile.values || user.profile.values,
        riskTolerance: {
          ...user.profile.riskTolerance,
          ...profile.riskTolerance
        },
        communicationStyle: {
          ...user.profile.communicationStyle,
          ...profile.communicationStyle
        }
      };
    }

    // Update preferences if provided
    if (preferences) {
      user.preferences = {
        ...user.preferences,
        ...preferences,
        // Merge nested objects properly
        notifications: {
          ...user.preferences.notifications,
          ...preferences.notifications,
          quietHours: {
            ...user.preferences.notifications.quietHours,
            ...preferences.notifications?.quietHours
          }
        },
        dataRetention: {
          ...user.preferences.dataRetention,
          ...preferences.dataRetention
        },
        ui: {
          ...user.preferences.ui,
          ...preferences.ui
        }
      };
    }

    // Update privacy settings if provided
    if (privacySettings) {
      user.privacySettings = {
        ...user.privacySettings,
        ...privacySettings,
        // Merge nested objects properly
        dataSharing: {
          ...user.privacySettings.dataSharing,
          ...privacySettings.dataSharing
        },
        visibility: {
          ...user.privacySettings.visibility,
          ...privacySettings.visibility,
          dataVisibility: {
            ...user.privacySettings.visibility.dataVisibility,
            ...privacySettings.visibility?.dataVisibility
          }
        },
        consent: {
          ...user.privacySettings.consent,
          ...privacySettings.consent,
          dataCollection: {
            ...user.privacySettings.consent.dataCollection,
            ...privacySettings.consent?.dataCollection
          },
          processing: {
            ...user.privacySettings.consent.processing,
            ...privacySettings.consent?.processing
          },
          storage: {
            ...user.privacySettings.consent.storage,
            ...privacySettings.consent?.storage
          },
          lastUpdated: new Date()
        }
      };
    }

    // Update last active timestamp
    user.lastActive = new Date();

    // Save updated user
    users.set(userId, user);

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        profile: user.profile,
        preferences: user.preferences,
        privacySettings: user.privacySettings
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}