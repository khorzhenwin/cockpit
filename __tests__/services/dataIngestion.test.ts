// Unit tests for Data Ingestion Service

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataIngestionService, DATA_SOURCE_PROVIDERS } from '../../lib/services/dataIngestion';
import { DataSourceRepository } from '../../lib/repositories/dataSourceRepository';
import { CredentialStorageService } from '../../lib/security/credentialStorage';
import { CredentialRepository } from '../../lib/repositories/credentialRepository';

// Mock fetch globally
global.fetch = vi.fn();

// Mock encryption module
vi.mock('../../lib/security/encryption', () => ({
  EncryptionService: {
    generateSecureToken: vi.fn(() => '1234567890123456789012345678901234567890123456789012345678901234'),
    encryptObject: vi.fn((obj) => JSON.stringify({ encrypted: 'mock-encrypted-data' })),
    decryptObject: vi.fn(() => ({ accessToken: 'mock-token', tokenType: 'Bearer' }))
  },
  encryptCredentials: vi.fn(() => 'mock-encrypted-credentials'),
  decryptCredentials: vi.fn(() => ({ accessToken: 'mock-token', tokenType: 'Bearer', expiresAt: new Date(Date.now() + 3600000) }))
}));

describe('DataIngestionService', () => {
  let dataIngestionService: DataIngestionService;
  let dataSourceRepository: DataSourceRepository;
  let credentialStorageService: CredentialStorageService;
  let credentialRepository: CredentialRepository;

  beforeEach(() => {
    dataSourceRepository = new DataSourceRepository();
    credentialRepository = new CredentialRepository();
    credentialStorageService = new CredentialStorageService(credentialRepository);
    dataIngestionService = new DataIngestionService(dataSourceRepository);
    
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('initiateOAuthFlow', () => {
    it('should generate OAuth URL for supported provider', async () => {
      const userId = 'test-user-id';
      const provider = 'plaid';

      const result = await dataIngestionService.initiateOAuthFlow(userId, provider);

      expect(result).toHaveProperty('authUrl');
      expect(result).toHaveProperty('state');
      expect(result.authUrl).toContain(DATA_SOURCE_PROVIDERS[provider].oauthConfig.authUrl);
      expect(result.state).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should throw error for unsupported provider', async () => {
      const userId = 'test-user-id';
      const provider = 'unsupported-provider';

      await expect(
        dataIngestionService.initiateOAuthFlow(userId, provider)
      ).rejects.toThrow('Unsupported provider: unsupported-provider');
    });

    it('should use provided state parameter', async () => {
      const userId = 'test-user-id';
      const provider = 'google_calendar';
      const customState = 'custom-state-123';

      const result = await dataIngestionService.initiateOAuthFlow(userId, provider, customState);

      expect(result.state).toBe(customState);
    });
  });

  describe('completeOAuthFlow', () => {
    it('should successfully complete OAuth flow with valid code', async () => {
      const userId = 'test-user-id';
      const provider = 'plaid';
      const authCode = 'test-auth-code';
      const state = 'test-state';

      // Mock successful token exchange
      const mockTokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse)
      });

      const result = await dataIngestionService.completeOAuthFlow(
        userId,
        provider,
        authCode,
        state
      );

      expect(result.success).toBe(true);
      expect(result.connectionId).toBeDefined();
      expect(result.capabilities).toEqual(DATA_SOURCE_PROVIDERS[provider].capabilities);
    });

    it('should handle token exchange failure', async () => {
      const userId = 'test-user-id';
      const provider = 'fitbit';
      const authCode = 'invalid-code';
      const state = 'test-state';

      // Mock failed token exchange
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Invalid authorization code')
      });

      const result = await dataIngestionService.completeOAuthFlow(
        userId,
        provider,
        authCode,
        state
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token exchange failed');
    });

    it('should throw error for unsupported provider', async () => {
      const userId = 'test-user-id';
      const provider = 'unsupported';
      const authCode = 'test-code';
      const state = 'test-state';

      const result = await dataIngestionService.completeOAuthFlow(
        userId,
        provider,
        authCode,
        state
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported provider');
    });
  });

  describe('connectDataSource', () => {
    it('should successfully connect data source with valid config', async () => {
      const userId = 'test-user-id';
      const config = {
        type: 'financial' as const,
        credentials: {
          encryptedData: 'encrypted-credentials',
          keyId: 'default',
          algorithm: 'aes-256-cbc'
        },
        syncFrequency: {
          frequency: 'daily' as const,
          timeOfDay: '06:00'
        },
        dataTypes: ['transactions', 'accounts']
      };

      // Credentials will be mocked by the module mock

      const result = await dataIngestionService.connectDataSource(userId, config);

      expect(result.success).toBe(true);
      expect(result.connectionId).toBeDefined();
    });

    it('should fail with invalid configuration', async () => {
      const userId = 'test-user-id';
      const invalidConfig = {
        type: 'financial' as const,
        credentials: {
          encryptedData: '',
          keyId: 'default',
          algorithm: 'aes-256-cbc'
        },
        syncFrequency: {
          frequency: 'daily' as const
        },
        dataTypes: []
      };

      const result = await dataIngestionService.connectDataSource(userId, invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid configuration');
    });
  });

  describe('syncData', () => {
    it('should successfully sync data from connected source', async () => {
      const userId = 'test-user-id';
      
      // Create a test data source
      const dataSource = await dataSourceRepository.create({
        userId,
        type: 'financial',
        name: 'Test Bank',
        provider: 'plaid',
        status: 'connected',
        credentials: 'encrypted-credentials',
        syncFrequency: { frequency: 'daily' },
        dataTypes: ['transactions'],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Credentials will be mocked by the module mock

      const result = await dataIngestionService.syncData(dataSource.id);

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBeDefined();
      expect(result.lastSyncTime).toBeDefined();
    });

    it('should fail for non-existent data source', async () => {
      const nonExistentId = 'non-existent-id';

      const result = await dataIngestionService.syncData(nonExistentId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Data source not found: non-existent-id');
    });

    it('should fail for disconnected data source', async () => {
      const userId = 'test-user-id';
      
      // Create a disconnected data source
      const dataSource = await dataSourceRepository.create({
        userId,
        type: 'financial',
        name: 'Test Bank',
        provider: 'plaid',
        status: 'disconnected',
        credentials: 'encrypted-credentials',
        syncFrequency: { frequency: 'daily' },
        dataTypes: ['transactions'],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await dataIngestionService.syncData(dataSource.id);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Data source is not connected');
    });
  });

  describe('disconnectDataSource', () => {
    it('should successfully disconnect data source', async () => {
      const userId = 'test-user-id';
      
      // Create a connected data source
      const dataSource = await dataSourceRepository.create({
        userId,
        type: 'financial',
        name: 'Test Bank',
        provider: 'plaid',
        status: 'connected',
        credentials: 'encrypted-credentials',
        syncFrequency: { frequency: 'daily' },
        dataTypes: ['transactions'],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await dataIngestionService.disconnectDataSource(dataSource.id);

      expect(result).toBe(true);
      
      // Verify status was updated
      const updatedDataSource = await dataSourceRepository.findById(dataSource.id);
      expect(updatedDataSource?.status).toBe('disconnected');
    });

    it('should return false for non-existent data source', async () => {
      const nonExistentId = 'non-existent-id';

      const result = await dataIngestionService.disconnectDataSource(nonExistentId);

      expect(result).toBe(false);
    });
  });

  describe('getUserDataSources', () => {
    it('should return all data sources for a user', async () => {
      const userId = 'test-user-id';
      const otherUserId = 'other-user-id';

      // Create data sources for different users
      await dataSourceRepository.create({
        userId,
        type: 'financial',
        name: 'User Bank',
        provider: 'plaid',
        status: 'connected',
        syncFrequency: { frequency: 'daily' },
        dataTypes: ['transactions'],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await dataSourceRepository.create({
        userId: otherUserId,
        type: 'calendar',
        name: 'Other Calendar',
        provider: 'google_calendar',
        status: 'connected',
        syncFrequency: { frequency: 'hourly' },
        dataTypes: ['events'],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const userDataSources = await dataIngestionService.getUserDataSources(userId);

      expect(userDataSources).toHaveLength(1);
      expect(userDataSources[0].userId).toBe(userId);
      expect(userDataSources[0].name).toBe('User Bank');
    });

    it('should return empty array for user with no data sources', async () => {
      const userId = 'user-with-no-sources';

      const userDataSources = await dataIngestionService.getUserDataSources(userId);

      expect(userDataSources).toHaveLength(0);
    });
  });
});