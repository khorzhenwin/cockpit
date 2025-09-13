import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';
import registerHandler from '../../pages/api/auth/register';
import updateProfileHandler from '../../pages/api/profile/update';
import updatePrivacyHandler from '../../pages/api/profile/privacy';
import updateConsentHandler from '../../pages/api/profile/consent';

// Mock environment variables
vi.mock('../../lib/config/environment', () => ({
  config: {
    JWT_SECRET: 'test-secret-key-that-is-at-least-32-characters-long',
    JWT_EXPIRES_IN: '24h',
    ENCRYPTION_KEY: 'test-encryption-key-that-is-32-chars'
  }
}));

// Mock UUID
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234'
}));

describe('/api/profile/update', () => {
  let validToken: string;
  let userId: string;

  beforeEach(async () => {
    // Clear users storage and register a test user
    const { users, usersByEmail } = require('../../pages/api/auth/register');
    users.clear();
    usersByEmail.clear();

    // Register test user
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password123'
      }
    });

    await registerHandler(req, res);
    const data = JSON.parse(res._getData());
    validToken = data.token;
    userId = data.user.id;
  });

  it('should update user profile successfully', async () => {
    const profileUpdate = {
      profile: {
        demographics: {
          age: 30,
          location: 'New York',
          occupation: 'Software Engineer'
        },
        riskTolerance: {
          financial: 'aggressive',
          career: 'ambitious',
          personal: 'adventurous'
        }
      }
    };

    const { req, res } = createMocks({
      method: 'PUT',
      headers: {
        authorization: `Bearer ${validToken}`
      },
      body: profileUpdate
    });

    await updateProfileHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.user.profile.demographics.age).toBe(30);
    expect(data.user.profile.demographics.location).toBe('New York');
    expect(data.user.profile.riskTolerance.financial).toBe('aggressive');
  });

  it('should update user preferences successfully', async () => {
    const preferencesUpdate = {
      preferences: {
        notifications: {
          insights: false,
          alerts: true,
          quietHours: {
            enabled: true,
            start: '23:00',
            end: '07:00'
          }
        },
        ui: {
          theme: 'dark',
          language: 'es'
        }
      }
    };

    const { req, res } = createMocks({
      method: 'PUT',
      headers: {
        authorization: `Bearer ${validToken}`
      },
      body: preferencesUpdate
    });

    await updateProfileHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.user.preferences.notifications.insights).toBe(false);
    expect(data.user.preferences.notifications.quietHours.enabled).toBe(true);
    expect(data.user.preferences.ui.theme).toBe('dark');
  });

  it('should update privacy settings successfully', async () => {
    const privacyUpdate = {
      privacySettings: {
        dataSharing: {
          allowAnalytics: false,
          allowResearch: true
        },
        visibility: {
          profileVisibility: 'public',
          insightSharing: true
        }
      }
    };

    const { req, res } = createMocks({
      method: 'PUT',
      headers: {
        authorization: `Bearer ${validToken}`
      },
      body: privacyUpdate
    });

    await updateProfileHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.user.privacySettings.dataSharing.allowAnalytics).toBe(false);
    expect(data.user.privacySettings.visibility.profileVisibility).toBe('public');
  });

  it('should reject request without authentication', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      body: {
        profile: {
          demographics: { age: 30 }
        }
      }
    });

    await updateProfileHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('No token provided');
  });

  it('should reject non-PUT requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: `Bearer ${validToken}`
      }
    });

    await updateProfileHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Method not allowed');
  });
});

describe('/api/profile/privacy', () => {
  let validToken: string;
  let userId: string;

  beforeEach(async () => {
    // Clear users storage and register a test user
    const { users, usersByEmail } = require('../../pages/api/auth/register');
    users.clear();
    usersByEmail.clear();

    // Register test user
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password123'
      }
    });

    await registerHandler(req, res);
    const data = JSON.parse(res._getData());
    validToken = data.token;
    userId = data.user.id;
  });

  it('should update data sharing settings', async () => {
    const privacyUpdate = {
      dataSharing: {
        allowAnalytics: false,
        allowImprovement: true,
        allowResearch: false,
        thirdPartyIntegrations: false
      }
    };

    const { req, res } = createMocks({
      method: 'PUT',
      headers: {
        authorization: `Bearer ${validToken}`
      },
      body: privacyUpdate
    });

    await updatePrivacyHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.privacySettings.dataSharing.allowAnalytics).toBe(false);
    expect(data.privacySettings.dataSharing.allowImprovement).toBe(true);
    expect(data.privacySettings.dataSharing.thirdPartyIntegrations).toBe(false);
  });

  it('should update visibility settings', async () => {
    const privacyUpdate = {
      visibility: {
        profileVisibility: 'limited',
        dataVisibility: {
          financial: false,
          health: true,
          career: true
        },
        insightSharing: false
      }
    };

    const { req, res } = createMocks({
      method: 'PUT',
      headers: {
        authorization: `Bearer ${validToken}`
      },
      body: privacyUpdate
    });

    await updatePrivacyHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.privacySettings.visibility.profileVisibility).toBe('limited');
    expect(data.privacySettings.visibility.dataVisibility.financial).toBe(false);
    expect(data.privacySettings.visibility.dataVisibility.health).toBe(true);
  });

  it('should update consent settings', async () => {
    const privacyUpdate = {
      consent: {
        dataCollection: {
          basic: true,
          financial: false,
          health: true
        },
        processing: {
          insights: true,
          recommendations: false
        }
      }
    };

    const { req, res } = createMocks({
      method: 'PUT',
      headers: {
        authorization: `Bearer ${validToken}`
      },
      body: privacyUpdate
    });

    await updatePrivacyHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.privacySettings.consent.dataCollection.basic).toBe(true);
    expect(data.privacySettings.consent.dataCollection.financial).toBe(false);
    expect(data.privacySettings.consent.processing.insights).toBe(true);
    expect(data.privacySettings.consent.processing.recommendations).toBe(false);
  });

  it('should reject request without authentication', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      body: {
        dataSharing: { allowAnalytics: false }
      }
    });

    await updatePrivacyHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('No token provided');
  });
});

describe('/api/profile/consent', () => {
  let validToken: string;
  let userId: string;

  beforeEach(async () => {
    // Clear users storage and register a test user
    const { users, usersByEmail } = require('../../pages/api/auth/register');
    users.clear();
    usersByEmail.clear();

    // Register test user
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password123'
      }
    });

    await registerHandler(req, res);
    const data = JSON.parse(res._getData());
    validToken = data.token;
    userId = data.user.id;
  });

  it('should update single consent setting', async () => {
    const consentUpdate = {
      consentType: 'dataCollection',
      consentKey: 'financial',
      granted: true
    };

    const { req, res } = createMocks({
      method: 'PUT',
      headers: {
        authorization: `Bearer ${validToken}`
      },
      body: consentUpdate
    });

    await updateConsentHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.consent.dataCollection.financial).toBe(true);
    expect(data.consent.lastUpdated).toBeDefined();
  });

  it('should update multiple consent settings', async () => {
    const consentUpdate = {
      consents: [
        {
          type: 'dataCollection',
          key: 'financial',
          granted: true
        },
        {
          type: 'processing',
          key: 'insights',
          granted: false
        },
        {
          type: 'storage',
          key: 'backup',
          granted: true
        }
      ]
    };

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: `Bearer ${validToken}`
      },
      body: consentUpdate
    });

    await updateConsentHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.consent.dataCollection.financial).toBe(true);
    expect(data.consent.processing.insights).toBe(false);
    expect(data.consent.storage.backup).toBe(true);
  });

  it('should reject invalid consent type', async () => {
    const consentUpdate = {
      consentType: 'invalidType',
      consentKey: 'financial',
      granted: true
    };

    const { req, res } = createMocks({
      method: 'PUT',
      headers: {
        authorization: `Bearer ${validToken}`
      },
      body: consentUpdate
    });

    await updateConsentHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBe('consentType, consentKey, and granted are required');
  });

  it('should reject missing required fields', async () => {
    const consentUpdate = {
      consentType: 'dataCollection',
      granted: true
      // Missing consentKey
    };

    const { req, res } = createMocks({
      method: 'PUT',
      headers: {
        authorization: `Bearer ${validToken}`
      },
      body: consentUpdate
    });

    await updateConsentHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBe('consentType, consentKey, and granted are required');
  });

  it('should reject invalid bulk consent format', async () => {
    const consentUpdate = {
      consents: [
        {
          type: 'dataCollection',
          // Missing key and granted
        }
      ]
    };

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: `Bearer ${validToken}`
      },
      body: consentUpdate
    });

    await updateConsentHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBe('Each consent must have type, key, and granted fields');
  });

  it('should reject request without authentication', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      body: {
        consentType: 'dataCollection',
        consentKey: 'financial',
        granted: true
      }
    });

    await updateConsentHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('No token provided');
  });
});