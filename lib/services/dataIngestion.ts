// Data Ingestion Service with OAuth integration capabilities

import { 
  DataSourceConfig, 
  ConnectionResult, 
  SyncResult, 
  EncryptedCredentials,
  ValidationResult,
  SyncSchedule 
} from '../models/common';
import { EncryptionService, encryptCredentials, decryptCredentials } from '../security/encryption';
import { config } from '../config/environment';

export interface DataSource {
  id: string;
  userId: string;
  type: 'financial' | 'calendar' | 'health' | 'social' | 'manual';
  name: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  credentials?: EncryptedCredentials;
  syncFrequency: SyncSchedule;
  dataTypes: string[];
  lastSync?: Date;
  nextSync?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType: string;
  scope?: string;
}

export interface DataSourceProvider {
  name: string;
  type: 'financial' | 'calendar' | 'health' | 'social';
  oauthConfig: OAuthConfig;
  supportedDataTypes: string[];
  capabilities: string[];
}

// Predefined data source providers
export const DATA_SOURCE_PROVIDERS: Record<string, DataSourceProvider> = {
  plaid: {
    name: 'Plaid',
    type: 'financial',
    oauthConfig: {
      clientId: config.FINANCIAL_API_KEY || '',
      clientSecret: process.env.PLAID_SECRET || '',
      redirectUri: `${config.HOST}/api/auth/callback/plaid`,
      scopes: ['transactions', 'accounts', 'identity'],
      authUrl: 'https://production.plaid.com/link/token/create',
      tokenUrl: 'https://production.plaid.com/link/token/exchange'
    },
    supportedDataTypes: ['transactions', 'accounts', 'balances', 'identity'],
    capabilities: ['real-time-sync', 'historical-data', 'categorization']
  },
  google_calendar: {
    name: 'Google Calendar',
    type: 'calendar',
    oauthConfig: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: `${config.HOST}/api/auth/callback/google`,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token'
    },
    supportedDataTypes: ['events', 'calendars', 'availability'],
    capabilities: ['real-time-sync', 'webhook-notifications']
  },
  fitbit: {
    name: 'Fitbit',
    type: 'health',
    oauthConfig: {
      clientId: process.env.FITBIT_CLIENT_ID || '',
      clientSecret: process.env.FITBIT_CLIENT_SECRET || '',
      redirectUri: `${config.HOST}/api/auth/callback/fitbit`,
      scopes: ['activity', 'heartrate', 'sleep', 'weight'],
      authUrl: 'https://www.fitbit.com/oauth2/authorize',
      tokenUrl: 'https://api.fitbit.com/oauth2/token'
    },
    supportedDataTypes: ['activity', 'heartrate', 'sleep', 'weight', 'nutrition'],
    capabilities: ['real-time-sync', 'historical-data', 'intraday-data']
  }
};

export class DataIngestionService {
  private dataSourceRepository: DataSourceRepository;

  constructor(dataSourceRepository: DataSourceRepository) {
    this.dataSourceRepository = dataSourceRepository;
  }

  /**
   * Initiate OAuth flow for a data source
   */
  async initiateOAuthFlow(
    userId: string, 
    providerName: string, 
    state?: string
  ): Promise<{ authUrl: string; state: string }> {
    const provider = DATA_SOURCE_PROVIDERS[providerName];
    if (!provider) {
      throw new Error(`Unsupported provider: ${providerName}`);
    }

    // Generate secure state parameter if not provided
    const oauthState = state || EncryptionService.generateSecureToken(32);
    
    // Build authorization URL
    const params = new URLSearchParams({
      client_id: provider.oauthConfig.clientId,
      redirect_uri: provider.oauthConfig.redirectUri,
      scope: provider.oauthConfig.scopes.join(' '),
      response_type: 'code',
      state: oauthState,
      access_type: 'offline', // Request refresh token
      prompt: 'consent'
    });

    const authUrl = `${provider.oauthConfig.authUrl}?${params.toString()}`;

    return { authUrl, state: oauthState };
  }

  /**
   * Complete OAuth flow and establish connection
   */
  async completeOAuthFlow(
    userId: string,
    providerName: string,
    authorizationCode: string,
    state: string
  ): Promise<ConnectionResult> {
    try {
      const provider = DATA_SOURCE_PROVIDERS[providerName];
      if (!provider) {
        throw new Error(`Unsupported provider: ${providerName}`);
      }

      // Exchange authorization code for tokens
      const tokens = await this.exchangeCodeForTokens(provider, authorizationCode);
      
      // Encrypt and store credentials
      const encryptedCredentials = encryptCredentials(tokens);
      
      // Create data source configuration
      const dataSourceConfig: DataSourceConfig = {
        type: provider.type,
        credentials: {
          encryptedData: encryptedCredentials,
          keyId: 'default',
          algorithm: 'aes-256-cbc'
        },
        syncFrequency: {
          frequency: 'daily',
          timeOfDay: '06:00'
        },
        dataTypes: provider.supportedDataTypes
      };

      // Test connection
      const connectionTest = await this.testConnection(provider, tokens);
      if (!connectionTest.success) {
        throw new Error(`Connection test failed: ${connectionTest.error}`);
      }

      // Save data source
      const dataSource = await this.dataSourceRepository.create({
        userId,
        type: provider.type,
        name: provider.name,
        provider: providerName,
        status: 'connected',
        credentials: encryptedCredentials,
        syncFrequency: dataSourceConfig.syncFrequency,
        dataTypes: provider.supportedDataTypes,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return {
        success: true,
        connectionId: dataSource.id,
        capabilities: provider.capabilities
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        capabilities: []
      };
    }
  }

  /**
   * Connect a data source with provided configuration
   */
  async connectDataSource(
    userId: string, 
    config: DataSourceConfig
  ): Promise<ConnectionResult> {
    try {
      // Validate configuration
      const validation = this.validateDataSourceConfig(config);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Decrypt credentials for testing
      const credentials = decryptCredentials<OAuthTokens>(config.credentials.encryptedData);
      
      // Find provider for this configuration
      const provider = this.findProviderByType(config.type);
      if (!provider) {
        throw new Error(`No provider found for type: ${config.type}`);
      }

      // Test connection
      const connectionTest = await this.testConnection(provider, credentials);
      if (!connectionTest.success) {
        throw new Error(`Connection test failed: ${connectionTest.error}`);
      }

      // Create data source record
      const dataSource = await this.dataSourceRepository.create({
        userId,
        type: config.type,
        name: provider.name,
        provider: provider.name.toLowerCase().replace(/\s+/g, '_'),
        status: 'connected',
        credentials: config.credentials.encryptedData,
        syncFrequency: config.syncFrequency,
        dataTypes: config.dataTypes,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return {
        success: true,
        connectionId: dataSource.id,
        capabilities: provider.capabilities
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        capabilities: []
      };
    }
  }

  /**
   * Sync data from a connected source
   */
  async syncData(sourceId: string): Promise<SyncResult> {
    try {
      const dataSource = await this.dataSourceRepository.findById(sourceId);
      if (!dataSource) {
        throw new Error(`Data source not found: ${sourceId}`);
      }

      if (dataSource.status !== 'connected') {
        throw new Error(`Data source is not connected: ${dataSource.status}`);
      }

      // Decrypt credentials
      const credentials = decryptCredentials<OAuthTokens>(dataSource.credentials!);
      
      // Check if token needs refresh
      if (credentials.expiresAt && credentials.expiresAt < new Date()) {
        const refreshedCredentials = await this.refreshTokens(dataSource.provider, credentials);
        if (refreshedCredentials) {
          // Update stored credentials
          const encryptedCredentials = encryptCredentials(refreshedCredentials);
          await this.dataSourceRepository.updateCredentials(sourceId, encryptedCredentials);
          credentials.accessToken = refreshedCredentials.accessToken;
        }
      }

      // Perform data sync based on provider
      const provider = DATA_SOURCE_PROVIDERS[dataSource.provider];
      const syncResult = await this.performDataSync(provider, dataSource, credentials);

      // Update sync timestamps
      await this.dataSourceRepository.updateSyncStatus(sourceId, {
        lastSync: new Date(),
        nextSync: this.calculateNextSync(dataSource.syncFrequency),
        status: 'connected',
        errorMessage: null
      });

      return syncResult;

    } catch (error) {
      // Update error status
      await this.dataSourceRepository.updateSyncStatus(sourceId, {
        status: 'error',
        errorMessage: error.message
      });

      return {
        success: false,
        recordsProcessed: 0,
        recordsUpdated: 0,
        recordsCreated: 0,
        errors: [error.message],
        lastSyncTime: new Date()
      };
    }
  }

  /**
   * Disconnect a data source
   */
  async disconnectDataSource(sourceId: string): Promise<boolean> {
    try {
      const dataSource = await this.dataSourceRepository.findById(sourceId);
      if (!dataSource) {
        return false;
      }

      // Revoke tokens if possible
      if (dataSource.credentials) {
        try {
          const credentials = decryptCredentials<OAuthTokens>(dataSource.credentials);
          await this.revokeTokens(dataSource.provider, credentials);
        } catch (error) {
          // Log but don't fail the disconnection
          console.warn(`Failed to revoke tokens for ${sourceId}:`, error.message);
        }
      }

      // Update status
      await this.dataSourceRepository.updateStatus(sourceId, 'disconnected');
      
      return true;
    } catch (error) {
      console.error(`Failed to disconnect data source ${sourceId}:`, error);
      return false;
    }
  }

  /**
   * Get all data sources for a user
   */
  async getUserDataSources(userId: string): Promise<DataSource[]> {
    return this.dataSourceRepository.findByUserId(userId);
  }

  /**
   * Validate data source configuration
   */
  private validateDataSourceConfig(config: DataSourceConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.type) {
      errors.push('Data source type is required');
    }

    if (!config.credentials || !config.credentials.encryptedData) {
      errors.push('Credentials are required');
    }

    if (!config.syncFrequency || !config.syncFrequency.frequency) {
      errors.push('Sync frequency is required');
    }

    if (!config.dataTypes || config.dataTypes.length === 0) {
      warnings.push('No data types specified');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Exchange authorization code for access tokens
   */
  private async exchangeCodeForTokens(
    provider: DataSourceProvider, 
    authorizationCode: string
  ): Promise<OAuthTokens> {
    const response = await fetch(provider.oauthConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: provider.oauthConfig.clientId,
        client_secret: provider.oauthConfig.clientSecret,
        code: authorizationCode,
        redirect_uri: provider.oauthConfig.redirectUri
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokenData = await response.json();
    
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in ? 
        new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
      tokenType: tokenData.token_type || 'Bearer',
      scope: tokenData.scope
    };
  }

  /**
   * Test connection to data source
   */
  private async testConnection(
    provider: DataSourceProvider, 
    credentials: OAuthTokens
  ): Promise<ConnectionResult> {
    try {
      // This would be provider-specific implementation
      // For now, just verify the token format
      if (!credentials.accessToken) {
        throw new Error('Invalid access token');
      }

      // In a real implementation, this would make an API call to test the connection
      // For testing purposes, we'll simulate a successful connection
      return {
        success: true,
        capabilities: provider.capabilities
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        capabilities: []
      };
    }
  }

  /**
   * Refresh OAuth tokens
   */
  private async refreshTokens(
    providerName: string, 
    credentials: OAuthTokens
  ): Promise<OAuthTokens | null> {
    if (!credentials.refreshToken) {
      return null;
    }

    const provider = DATA_SOURCE_PROVIDERS[providerName];
    if (!provider) {
      return null;
    }

    try {
      const response = await fetch(provider.oauthConfig.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: provider.oauthConfig.clientId,
          client_secret: provider.oauthConfig.clientSecret,
          refresh_token: credentials.refreshToken
        })
      });

      if (!response.ok) {
        return null;
      }

      const tokenData = await response.json();
      
      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || credentials.refreshToken,
        expiresAt: tokenData.expires_in ? 
          new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
        tokenType: tokenData.token_type || 'Bearer',
        scope: tokenData.scope
      };
    } catch (error) {
      console.error(`Failed to refresh tokens for ${providerName}:`, error);
      return null;
    }
  }

  /**
   * Revoke OAuth tokens
   */
  private async revokeTokens(providerName: string, credentials: OAuthTokens): Promise<void> {
    const provider = DATA_SOURCE_PROVIDERS[providerName];
    if (!provider) {
      return;
    }

    // Provider-specific token revocation would be implemented here
    // For now, just log the action
    console.log(`Revoking tokens for provider: ${providerName}`);
  }

  /**
   * Perform actual data synchronization
   */
  private async performDataSync(
    provider: DataSourceProvider,
    dataSource: DataSource,
    credentials: OAuthTokens
  ): Promise<SyncResult> {
    // This would contain provider-specific sync logic
    // For now, return a mock successful sync
    return {
      success: true,
      recordsProcessed: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      errors: [],
      lastSyncTime: new Date()
    };
  }

  /**
   * Calculate next sync time based on frequency
   */
  private calculateNextSync(syncFrequency: SyncSchedule): Date {
    const now = new Date();
    
    switch (syncFrequency.frequency) {
      case 'realtime':
        return new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
      case 'daily':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (syncFrequency.timeOfDay) {
          const [hours, minutes] = syncFrequency.timeOfDay.split(':').map(Number);
          tomorrow.setHours(hours, minutes, 0, 0);
        }
        return tomorrow;
      case 'weekly':
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek;
      case 'manual':
      default:
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year (effectively never)
    }
  }

  /**
   * Find provider by type
   */
  private findProviderByType(type: string): DataSourceProvider | null {
    return Object.values(DATA_SOURCE_PROVIDERS).find(provider => provider.type === type) || null;
  }
}

/**
 * Data Source Repository interface for database operations
 */
export interface DataSourceRepository {
  create(dataSource: Omit<DataSource, 'id'>): Promise<DataSource>;
  findById(id: string): Promise<DataSource | null>;
  findByUserId(userId: string): Promise<DataSource[]>;
  updateCredentials(id: string, encryptedCredentials: string): Promise<void>;
  updateSyncStatus(id: string, status: {
    lastSync?: Date;
    nextSync?: Date;
    status?: string;
    errorMessage?: string | null;
  }): Promise<void>;
  updateStatus(id: string, status: string): Promise<void>;
  delete(id: string): Promise<void>;
}