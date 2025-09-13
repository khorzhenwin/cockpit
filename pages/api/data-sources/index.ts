// Data source management API endpoints

import { NextApiRequest, NextApiResponse } from 'next';
import { DataIngestionService, DataSource } from '../../../lib/services/dataIngestion';
import { CredentialStorageService } from '../../../lib/security/credentialStorage';
import { authenticateRequest } from '../../../lib/security/auth';
import { DataSourceRepository } from '../../../lib/repositories/dataSourceRepository';
import { CredentialRepository } from '../../../lib/repositories/credentialRepository';

// Initialize services
const dataSourceRepository = new DataSourceRepository();
const credentialRepository = new CredentialRepository();
const dataIngestionService = new DataIngestionService(dataSourceRepository);
const credentialStorageService = new CredentialStorageService(credentialRepository);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authenticate the request
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGetDataSources(req, res, user.id);
      case 'POST':
        return await handleCreateDataSource(req, res, user.id);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Data sources API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all data sources for the authenticated user
 */
async function handleGetDataSources(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const dataSources = await dataIngestionService.getUserDataSources(userId);
    
    // Remove sensitive credential data from response
    const sanitizedDataSources = dataSources.map(source => ({
      ...source,
      credentials: source.credentials ? '***encrypted***' : undefined
    }));

    return res.status(200).json({
      success: true,
      dataSources: sanitizedDataSources
    });
  } catch (error) {
    console.error('Failed to get data sources:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve data sources' 
    });
  }
}

/**
 * Create a new data source connection
 */
async function handleCreateDataSource(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { type, provider, credentials, syncFrequency, dataTypes } = req.body;

    // Validate required fields
    if (!type || !provider || !credentials) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, provider, credentials'
      });
    }

    // Store credentials securely
    const credentialId = await credentialStorageService.storeCredentials(
      userId,
      provider,
      'oauth', // Assuming OAuth for now, could be determined from provider
      credentials
    );

    // Create data source configuration
    const dataSourceConfig = {
      type,
      credentials: {
        encryptedData: credentialId, // Store credential ID instead of actual data
        keyId: 'default',
        algorithm: 'aes-256-cbc'
      },
      syncFrequency: syncFrequency || {
        frequency: 'daily' as const,
        timeOfDay: '06:00'
      },
      dataTypes: dataTypes || []
    };

    // Connect the data source
    const connectionResult = await dataIngestionService.connectDataSource(
      userId,
      dataSourceConfig
    );

    if (!connectionResult.success) {
      // Clean up stored credentials if connection failed
      await credentialStorageService.deleteCredentials(credentialId, userId);
      
      return res.status(400).json({
        success: false,
        error: connectionResult.error
      });
    }

    return res.status(201).json({
      success: true,
      connectionId: connectionResult.connectionId,
      capabilities: connectionResult.capabilities
    });
  } catch (error) {
    console.error('Failed to create data source:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create data source connection'
    });
  }
}