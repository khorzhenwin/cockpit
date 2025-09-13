// Unit tests for Credential Storage Service

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  CredentialStorageService, 
  createOAuthCredentials,
  createApiKeyCredentials,
  createBasicAuthCredentials,
  createCertificateCredentials
} from '../../lib/security/credentialStorage';
import { CredentialRepository } from '../../lib/repositories/credentialRepository';
import { EncryptionService } from '../../lib/security/encryption';

// Set up test environment variables
process.env.ENCRYPTION_KEY = 'test_encryption_key_at_least_32_characters_long_for_testing';

describe('CredentialStorageService', () => {
  let credentialStorageService: CredentialStorageService;
  let credentialRepository: CredentialRepository;

  beforeEach(() => {
    credentialRepository = new CredentialRepository();
    credentialStorageService = new CredentialStorageService(credentialRepository);
    
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('storeCredentials', () => {
    it('should successfully store OAuth credentials', async () => {
      const userId = 'test-user-id';
      const provider = 'plaid';
      const credentials = createOAuthCredentials(
        'access-token-123',
        'refresh-token-456',
        3600,
        'Bearer',
        'transactions accounts'
      );

      const credentialId = await credentialStorageService.storeCredentials(
        userId,
        provider,
        'oauth',
        credentials,
        {
          scopes: ['transactions', 'accounts'],
          expiresAt: credentials.expiresAt
        }
      );

      expect(credentialId).toBeDefined();
      expect(credentialId).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should successfully store API key credentials', async () => {
      const userId = 'test-user-id';
      const provider = 'custom-api';
      const credentials = createApiKeyCredentials(
        'api-key-123',
        'secret-key-456',
        'production'
      );

      const credentialId = await credentialStorageService.storeCredentials(
        userId,
        provider,
        'api_key',
        credentials
      );

      expect(credentialId).toBeDefined();
    });

    it('should successfully store basic auth credentials', async () => {
      const userId = 'test-user-id';
      const provider = 'legacy-system';
      const credentials = createBasicAuthCredentials('username', 'password');

      const credentialId = await credentialStorageService.storeCredentials(
        userId,
        provider,
        'basic_auth',
        credentials
      );

      expect(credentialId).toBeDefined();
    });

    it('should successfully store certificate credentials', async () => {
      const userId = 'test-user-id';
      const provider = 'secure-api';
      const credentials = createCertificateCredentials(
        'certificate-data',
        'private-key-data',
        'passphrase'
      );

      const credentialId = await credentialStorageService.storeCredentials(
        userId,
        provider,
        'certificate',
        credentials
      );

      expect(credentialId).toBeDefined();
    });
  });

  describe('retrieveCredentials', () => {
    it('should successfully retrieve stored OAuth credentials', async () => {
      const userId = 'test-user-id';
      const provider = 'plaid';
      const originalCredentials = createOAuthCredentials(
        'access-token-123',
        'refresh-token-456',
        3600,
        'Bearer'
      );

      // Store credentials first
      const credentialId = await credentialStorageService.storeCredentials(
        userId,
        provider,
        'oauth',
        originalCredentials
      );

      // Retrieve credentials
      const retrievedCredentials = await credentialStorageService.retrieveCredentials(
        credentialId,
        userId
      );

      expect(retrievedCredentials?.accessToken).toBe(originalCredentials.accessToken);
      expect(retrievedCredentials?.refreshToken).toBe(originalCredentials.refreshToken);
      expect(retrievedCredentials?.tokenType).toBe(originalCredentials.tokenType);
    });

    it('should return null for non-existent credential', async () => {
      const userId = 'test-user-id';
      const nonExistentId = 'non-existent-id';

      const retrievedCredentials = await credentialStorageService.retrieveCredentials(
        nonExistentId,
        userId
      );

      expect(retrievedCredentials).toBeNull();
    });

    it('should return null for credential belonging to different user', async () => {
      const userId = 'test-user-id';
      const otherUserId = 'other-user-id';
      const provider = 'plaid';
      const credentials = createOAuthCredentials('access-token', 'refresh-token');

      // Store credentials for one user
      const credentialId = await credentialStorageService.storeCredentials(
        userId,
        provider,
        'oauth',
        credentials
      );

      // Try to retrieve with different user ID
      const retrievedCredentials = await credentialStorageService.retrieveCredentials(
        credentialId,
        otherUserId
      );

      expect(retrievedCredentials).toBeNull();
    });
  });

  describe('updateCredentials', () => {
    it('should successfully update existing credentials', async () => {
      const userId = 'test-user-id';
      const provider = 'plaid';
      const originalCredentials = createOAuthCredentials('old-token', 'old-refresh');
      const updatedCredentials = createOAuthCredentials('new-token', 'new-refresh');

      // Store original credentials
      const credentialId = await credentialStorageService.storeCredentials(
        userId,
        provider,
        'oauth',
        originalCredentials
      );

      // Update credentials
      const updateResult = await credentialStorageService.updateCredentials(
        credentialId,
        userId,
        updatedCredentials
      );

      expect(updateResult).toBe(true);

      // Verify update
      const retrievedCredentials = await credentialStorageService.retrieveCredentials(
        credentialId,
        userId
      );

      expect(retrievedCredentials).toEqual(updatedCredentials);
    });

    it('should return false for non-existent credential', async () => {
      const userId = 'test-user-id';
      const nonExistentId = 'non-existent-id';
      const credentials = createOAuthCredentials('token', 'refresh');

      const updateResult = await credentialStorageService.updateCredentials(
        nonExistentId,
        userId,
        credentials
      );

      expect(updateResult).toBe(false);
    });
  });

  describe('deleteCredentials', () => {
    it('should successfully delete existing credentials', async () => {
      const userId = 'test-user-id';
      const provider = 'plaid';
      const credentials = createOAuthCredentials('token', 'refresh');

      // Store credentials
      const credentialId = await credentialStorageService.storeCredentials(
        userId,
        provider,
        'oauth',
        credentials
      );

      // Delete credentials
      const deleteResult = await credentialStorageService.deleteCredentials(
        credentialId,
        userId
      );

      expect(deleteResult).toBe(true);

      // Verify deletion
      const retrievedCredentials = await credentialStorageService.retrieveCredentials(
        credentialId,
        userId
      );

      expect(retrievedCredentials).toBeNull();
    });

    it('should return false for non-existent credential', async () => {
      const userId = 'test-user-id';
      const nonExistentId = 'non-existent-id';

      const deleteResult = await credentialStorageService.deleteCredentials(
        nonExistentId,
        userId
      );

      expect(deleteResult).toBe(false);
    });
  });

  describe('listUserCredentials', () => {
    it('should return all credentials for a user without encrypted data', async () => {
      const userId = 'test-user-id';
      const otherUserId = 'other-user-id';

      // Store credentials for test user
      await credentialStorageService.storeCredentials(
        userId,
        'plaid',
        'oauth',
        createOAuthCredentials('token1', 'refresh1')
      );

      await credentialStorageService.storeCredentials(
        userId,
        'fitbit',
        'oauth',
        createOAuthCredentials('token2', 'refresh2')
      );

      // Store credential for other user
      await credentialStorageService.storeCredentials(
        otherUserId,
        'google',
        'oauth',
        createOAuthCredentials('token3', 'refresh3')
      );

      const userCredentials = await credentialStorageService.listUserCredentials(userId);

      expect(userCredentials).toHaveLength(2);
      expect(userCredentials[0].userId).toBe(userId);
      expect(userCredentials[1].userId).toBe(userId);
      
      // Verify encrypted data is not included
      userCredentials.forEach(cred => {
        expect(cred).not.toHaveProperty('encryptedData');
      });
    });
  });

  describe('areCredentialsExpired', () => {
    it('should return false for non-expired OAuth credentials', async () => {
      const userId = 'test-user-id';
      const provider = 'plaid';
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const credentials = createOAuthCredentials('token', 'refresh', 3600);

      const credentialId = await credentialStorageService.storeCredentials(
        userId,
        provider,
        'oauth',
        credentials,
        { expiresAt: futureDate }
      );

      const isExpired = await credentialStorageService.areCredentialsExpired(
        credentialId,
        userId
      );

      expect(isExpired).toBe(false);
    });

    it('should return true for expired OAuth credentials', async () => {
      const userId = 'test-user-id';
      const provider = 'plaid';
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const credentials = createOAuthCredentials('token', 'refresh', -3600);

      const credentialId = await credentialStorageService.storeCredentials(
        userId,
        provider,
        'oauth',
        credentials,
        { expiresAt: pastDate }
      );

      const isExpired = await credentialStorageService.areCredentialsExpired(
        credentialId,
        userId
      );

      expect(isExpired).toBe(true);
    });

    it('should return true for non-existent credential', async () => {
      const userId = 'test-user-id';
      const nonExistentId = 'non-existent-id';

      const isExpired = await credentialStorageService.areCredentialsExpired(
        nonExistentId,
        userId
      );

      expect(isExpired).toBe(true);
    });
  });

  describe('validateCredentialIntegrity', () => {
    it('should return true for valid OAuth credentials', async () => {
      const userId = 'test-user-id';
      const provider = 'plaid';
      const credentials = createOAuthCredentials('valid-token', 'refresh-token');

      const credentialId = await credentialStorageService.storeCredentials(
        userId,
        provider,
        'oauth',
        credentials
      );

      const isValid = await credentialStorageService.validateCredentialIntegrity(
        credentialId,
        userId
      );

      expect(isValid).toBe(true);
    });

    it('should return true for valid API key credentials', async () => {
      const userId = 'test-user-id';
      const provider = 'custom-api';
      const credentials = createApiKeyCredentials('valid-api-key');

      const credentialId = await credentialStorageService.storeCredentials(
        userId,
        provider,
        'api_key',
        credentials
      );

      const isValid = await credentialStorageService.validateCredentialIntegrity(
        credentialId,
        userId
      );

      expect(isValid).toBe(true);
    });

    it('should return false for non-existent credential', async () => {
      const userId = 'test-user-id';
      const nonExistentId = 'non-existent-id';

      const isValid = await credentialStorageService.validateCredentialIntegrity(
        nonExistentId,
        userId
      );

      expect(isValid).toBe(false);
    });
  });

  describe('maskCredentialData', () => {
    it('should mask OAuth credentials properly', () => {
      const credentials = createOAuthCredentials(
        'very-long-access-token-123456789',
        'very-long-refresh-token-987654321'
      );

      const masked = CredentialStorageService.maskCredentialData(credentials, 'oauth');

      expect(masked.accessToken).toBe('very************************6789');
      expect(masked.refreshToken).toBe('very*************************4321');
      expect(masked.tokenType).toBe('Bearer');
    });

    it('should mask API key credentials properly', () => {
      const credentials = createApiKeyCredentials(
        'api-key-123456789',
        'secret-key-987654321'
      );

      const masked = CredentialStorageService.maskCredentialData(credentials, 'api_key');

      expect(masked.apiKey).toBe('api-*********6789');
      expect(masked.secretKey).toBe('secr************4321');
    });

    it('should mask basic auth credentials properly', () => {
      const credentials = createBasicAuthCredentials('username', 'password');

      const masked = CredentialStorageService.maskCredentialData(credentials, 'basic_auth');

      expect(masked.username).toBe('username');
      expect(masked.password).toBe('***masked***');
    });

    it('should mask certificate credentials properly', () => {
      const credentials = createCertificateCredentials(
        'certificate-data',
        'private-key-data',
        'passphrase'
      );

      const masked = CredentialStorageService.maskCredentialData(credentials, 'certificate');

      expect(masked.certificate).toBe('***certificate-data***');
      expect(masked.privateKey).toBe('***private-key***');
      expect(masked.passphrase).toBe('***masked***');
    });
  });
});