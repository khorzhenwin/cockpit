// Secure credential storage and encryption utilities

import { EncryptionService } from './encryption';
import { config } from '../config/environment';

export interface StoredCredential {
  id: string;
  userId: string;
  provider: string;
  credentialType: 'oauth' | 'api_key' | 'basic_auth' | 'certificate';
  encryptedData: string;
  keyId: string;
  algorithm: string;
  metadata?: {
    scopes?: string[];
    expiresAt?: Date;
    lastRefreshed?: Date;
    permissions?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CredentialMetadata {
  scopes?: string[];
  expiresAt?: Date;
  lastRefreshed?: Date;
  permissions?: string[];
  [key: string]: any;
}

export interface OAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType: string;
  scope?: string;
}

export interface ApiKeyCredentials {
  apiKey: string;
  secretKey?: string;
  environment?: 'sandbox' | 'production';
}

export interface BasicAuthCredentials {
  username: string;
  password: string;
}

export interface CertificateCredentials {
  certificate: string;
  privateKey: string;
  passphrase?: string;
}

export type CredentialData = OAuthCredentials | ApiKeyCredentials | BasicAuthCredentials | CertificateCredentials;

export class CredentialStorageService {
  private static readonly KEY_ROTATION_INTERVAL = 90 * 24 * 60 * 60 * 1000; // 90 days
  private credentialRepository: CredentialRepository;

  constructor(credentialRepository: CredentialRepository) {
    this.credentialRepository = credentialRepository;
  }

  /**
   * Store encrypted credentials
   */
  async storeCredentials(
    userId: string,
    provider: string,
    credentialType: 'oauth' | 'api_key' | 'basic_auth' | 'certificate',
    credentials: CredentialData,
    metadata?: CredentialMetadata
  ): Promise<string> {
    try {
      // Generate unique credential ID
      const credentialId = EncryptionService.generateSecureToken(16);
      
      // Encrypt the credential data
      const encryptedData = EncryptionService.encryptObject(credentials);
      
      // Create stored credential record
      const storedCredential: StoredCredential = {
        id: credentialId,
        userId,
        provider,
        credentialType,
        encryptedData,
        keyId: 'default', // In production, this would reference a specific encryption key
        algorithm: 'aes-256-cbc',
        metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to repository
      await this.credentialRepository.create(storedCredential);

      return credentialId;
    } catch (error) {
      throw new Error(`Failed to store credentials: ${error.message}`);
    }
  }

  /**
   * Retrieve and decrypt credentials
   */
  async retrieveCredentials<T extends CredentialData>(
    credentialId: string,
    userId: string
  ): Promise<T | null> {
    try {
      const storedCredential = await this.credentialRepository.findById(credentialId);
      
      if (!storedCredential || storedCredential.userId !== userId) {
        return null;
      }

      // Decrypt the credential data
      const credentials = EncryptionService.decryptObject<T>(storedCredential.encryptedData);
      
      return credentials;
    } catch (error) {
      console.error(`Failed to retrieve credentials ${credentialId}:`, error);
      return null;
    }
  }

  /**
   * Update existing credentials
   */
  async updateCredentials(
    credentialId: string,
    userId: string,
    credentials: CredentialData,
    metadata?: CredentialMetadata
  ): Promise<boolean> {
    try {
      const existingCredential = await this.credentialRepository.findById(credentialId);
      
      if (!existingCredential || existingCredential.userId !== userId) {
        return false;
      }

      // Encrypt the new credential data
      const encryptedData = EncryptionService.encryptObject(credentials);
      
      // Update the stored credential
      await this.credentialRepository.update(credentialId, {
        encryptedData,
        metadata: metadata || existingCredential.metadata,
        updatedAt: new Date()
      });

      return true;
    } catch (error) {
      console.error(`Failed to update credentials ${credentialId}:`, error);
      return false;
    }
  }

  /**
   * Delete credentials
   */
  async deleteCredentials(credentialId: string, userId: string): Promise<boolean> {
    try {
      const existingCredential = await this.credentialRepository.findById(credentialId);
      
      if (!existingCredential || existingCredential.userId !== userId) {
        return false;
      }

      await this.credentialRepository.delete(credentialId);
      return true;
    } catch (error) {
      console.error(`Failed to delete credentials ${credentialId}:`, error);
      return false;
    }
  }

  /**
   * List all credentials for a user (without decrypting)
   */
  async listUserCredentials(userId: string): Promise<Omit<StoredCredential, 'encryptedData'>[]> {
    try {
      const credentials = await this.credentialRepository.findByUserId(userId);
      
      // Return credentials without the encrypted data
      return credentials.map(({ encryptedData, ...credential }) => credential);
    } catch (error) {
      console.error(`Failed to list credentials for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Check if credentials are expired
   */
  async areCredentialsExpired(credentialId: string, userId: string): Promise<boolean> {
    try {
      const storedCredential = await this.credentialRepository.findById(credentialId);
      
      if (!storedCredential || storedCredential.userId !== userId) {
        return true;
      }

      // Check metadata for expiration
      if (storedCredential.metadata?.expiresAt) {
        return storedCredential.metadata.expiresAt < new Date();
      }

      // If no expiration metadata, check if it's OAuth and decrypt to check
      if (storedCredential.credentialType === 'oauth') {
        const credentials = await this.retrieveCredentials<OAuthCredentials>(credentialId, userId);
        if (credentials?.expiresAt) {
          return credentials.expiresAt < new Date();
        }
      }

      return false;
    } catch (error) {
      console.error(`Failed to check credential expiration ${credentialId}:`, error);
      return true;
    }
  }

  /**
   * Refresh OAuth credentials
   */
  async refreshOAuthCredentials(
    credentialId: string,
    userId: string,
    newCredentials: OAuthCredentials
  ): Promise<boolean> {
    try {
      const metadata: CredentialMetadata = {
        expiresAt: newCredentials.expiresAt,
        lastRefreshed: new Date(),
        scopes: newCredentials.scope?.split(' ')
      };

      return await this.updateCredentials(credentialId, userId, newCredentials, metadata);
    } catch (error) {
      console.error(`Failed to refresh OAuth credentials ${credentialId}:`, error);
      return false;
    }
  }

  /**
   * Rotate encryption keys for stored credentials
   */
  async rotateEncryptionKeys(userId: string): Promise<number> {
    try {
      const credentials = await this.credentialRepository.findByUserId(userId);
      let rotatedCount = 0;

      for (const credential of credentials) {
        // Check if key rotation is needed (based on age)
        const keyAge = Date.now() - credential.updatedAt.getTime();
        if (keyAge > CredentialStorageService.KEY_ROTATION_INTERVAL) {
          try {
            // Decrypt with old key
            const decryptedData = EncryptionService.decryptObject(credential.encryptedData);
            
            // Re-encrypt with new key
            const newEncryptedData = EncryptionService.encryptObject(decryptedData);
            
            // Update stored credential
            await this.credentialRepository.update(credential.id, {
              encryptedData: newEncryptedData,
              updatedAt: new Date()
            });

            rotatedCount++;
          } catch (error) {
            console.error(`Failed to rotate key for credential ${credential.id}:`, error);
          }
        }
      }

      return rotatedCount;
    } catch (error) {
      console.error(`Failed to rotate encryption keys for user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Validate credential integrity
   */
  async validateCredentialIntegrity(credentialId: string, userId: string): Promise<boolean> {
    try {
      const storedCredential = await this.credentialRepository.findById(credentialId);
      
      if (!storedCredential || storedCredential.userId !== userId) {
        return false;
      }

      // Try to decrypt the credentials
      const credentials = EncryptionService.decryptObject(storedCredential.encryptedData);
      
      // Basic validation based on credential type
      switch (storedCredential.credentialType) {
        case 'oauth':
          const oauthCreds = credentials as OAuthCredentials;
          return !!(oauthCreds.accessToken && oauthCreds.tokenType);
          
        case 'api_key':
          const apiKeyCreds = credentials as ApiKeyCredentials;
          return !!apiKeyCreds.apiKey;
          
        case 'basic_auth':
          const basicCreds = credentials as BasicAuthCredentials;
          return !!(basicCreds.username && basicCreds.password);
          
        case 'certificate':
          const certCreds = credentials as CertificateCredentials;
          return !!(certCreds.certificate && certCreds.privateKey);
          
        default:
          return false;
      }
    } catch (error) {
      console.error(`Failed to validate credential integrity ${credentialId}:`, error);
      return false;
    }
  }

  /**
   * Get credentials that are about to expire
   */
  async getExpiringCredentials(userId: string, daysAhead: number = 7): Promise<StoredCredential[]> {
    try {
      const credentials = await this.credentialRepository.findByUserId(userId);
      const expiringCredentials: StoredCredential[] = [];
      const cutoffDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

      for (const credential of credentials) {
        if (credential.metadata?.expiresAt && credential.metadata.expiresAt <= cutoffDate) {
          expiringCredentials.push(credential);
        }
      }

      return expiringCredentials;
    } catch (error) {
      console.error(`Failed to get expiring credentials for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Mask sensitive credential data for logging/display
   */
  static maskCredentialData(credentials: CredentialData, credentialType: string): any {
    switch (credentialType) {
      case 'oauth':
        const oauth = credentials as OAuthCredentials;
        return {
          ...oauth,
          accessToken: this.maskToken(oauth.accessToken),
          refreshToken: oauth.refreshToken ? this.maskToken(oauth.refreshToken) : undefined
        };
        
      case 'api_key':
        const apiKey = credentials as ApiKeyCredentials;
        return {
          ...apiKey,
          apiKey: this.maskToken(apiKey.apiKey),
          secretKey: apiKey.secretKey ? this.maskToken(apiKey.secretKey) : undefined
        };
        
      case 'basic_auth':
        const basic = credentials as BasicAuthCredentials;
        return {
          username: basic.username,
          password: '***masked***'
        };
        
      case 'certificate':
        return {
          certificate: '***certificate-data***',
          privateKey: '***private-key***',
          passphrase: '***masked***'
        };
        
      default:
        return '***masked***';
    }
  }

  private static maskToken(token: string): string {
    if (token.length <= 8) {
      return '*'.repeat(token.length);
    }
    return token.substring(0, 4) + '*'.repeat(token.length - 8) + token.substring(token.length - 4);
  }
}

/**
 * Repository interface for credential storage operations
 */
export interface CredentialRepository {
  create(credential: StoredCredential): Promise<void>;
  findById(id: string): Promise<StoredCredential | null>;
  findByUserId(userId: string): Promise<StoredCredential[]>;
  update(id: string, updates: Partial<StoredCredential>): Promise<void>;
  delete(id: string): Promise<void>;
}

// Utility functions for common credential operations
export function createOAuthCredentials(
  accessToken: string,
  refreshToken?: string,
  expiresIn?: number,
  tokenType: string = 'Bearer',
  scope?: string
): OAuthCredentials {
  return {
    accessToken,
    refreshToken,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
    tokenType,
    scope
  };
}

export function createApiKeyCredentials(
  apiKey: string,
  secretKey?: string,
  environment: 'sandbox' | 'production' = 'production'
): ApiKeyCredentials {
  return {
    apiKey,
    secretKey,
    environment
  };
}

export function createBasicAuthCredentials(
  username: string,
  password: string
): BasicAuthCredentials {
  return {
    username,
    password
  };
}

export function createCertificateCredentials(
  certificate: string,
  privateKey: string,
  passphrase?: string
): CertificateCredentials {
  return {
    certificate,
    privateKey,
    passphrase
  };
}