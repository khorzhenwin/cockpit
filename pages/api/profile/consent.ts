import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/security/auth';
import { users } from '../auth/register';

interface ConsentRequest {
  consentType: 'dataCollection' | 'processing' | 'storage';
  consentKey: string;
  granted: boolean;
}

interface ConsentResponse {
  success: boolean;
  consent?: {
    dataCollection: Record<string, boolean>;
    processing: Record<string, boolean>;
    storage: Record<string, boolean>;
    lastUpdated: string;
  };
  error?: string;
}

interface BulkConsentRequest {
  consents: {
    type: 'dataCollection' | 'processing' | 'storage';
    key: string;
    granted: boolean;
  }[];
}

export default function handler(
  req: NextApiRequest & { user?: any },
  res: NextApiResponse<ConsentResponse>
) {
  if (req.method !== 'PUT' && req.method !== 'POST') {
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

    if (req.method === 'PUT') {
      // Single consent update
      const { consentType, consentKey, granted }: ConsentRequest = req.body;

      if (!consentType || !consentKey || typeof granted !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'consentType, consentKey, and granted are required'
        });
      }

      // Update specific consent
      user.privacySettings.consent[consentType][consentKey] = granted;
      user.privacySettings.consent.lastUpdated = new Date();

    } else if (req.method === 'POST') {
      // Bulk consent update
      const { consents }: BulkConsentRequest = req.body;

      if (!Array.isArray(consents)) {
        return res.status(400).json({
          success: false,
          error: 'consents must be an array'
        });
      }

      // Validate all consents first
      for (const consent of consents) {
        if (!consent.type || !consent.key || typeof consent.granted !== 'boolean') {
          return res.status(400).json({
            success: false,
            error: 'Each consent must have type, key, and granted fields'
          });
        }
      }

      // Apply all consents
      for (const consent of consents) {
        user.privacySettings.consent[consent.type][consent.key] = consent.granted;
      }
      user.privacySettings.consent.lastUpdated = new Date();
    }

    // Update last active timestamp
    user.lastActive = new Date();

    // Save updated user
    users.set(userId, user);

    res.status(200).json({
      success: true,
      consent: {
        dataCollection: user.privacySettings.consent.dataCollection,
        processing: user.privacySettings.consent.processing,
        storage: user.privacySettings.consent.storage,
        lastUpdated: user.privacySettings.consent.lastUpdated.toISOString()
      }
    });

  } catch (error) {
    console.error('Update consent error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

