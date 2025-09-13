// Individual data source management API

import { NextApiRequest, NextApiResponse } from 'next';
import { DataIngestionService } from '../../../lib/services/dataIngestion';
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

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid data source ID' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGetDataSource(req, res, user.id, id);
      case 'PUT':
        return await handleUpdateDataSource(req, res, user.id, id);
      case 'DELETE':
        return await handleDeleteDataSource(req, res, user.id, id);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Data source API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get a specific data source
 */
async function handleGetDataSource(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  dataSourceId: string
) {
  try {
    const dataSources = await dataIngestionService.getUserDataSources(userId);
    const dataSource = dataSources.find(ds => ds.id === dataSourceId);

    if (!dataSource) {
      return res.status(404).json({
        success: false,
        error: 'Data source not found'
      });
    }

    // Remove sensitive credential data from response
    const sanitizedDataSource = {
      ...dataSource,
      credentials: dataSource.credentials ? '***encrypted***' : undefined
    };

    return res.status(200).json({
      success: true,
      dataSource: sanitizedDataSource
    });
  } catch (error) {
    console.error('Failed to get data source:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve data source'
    });
  }
}

/**
 * Update a data source configuration
 */
async function handleUpdateDataSource(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  dataSourceId: string
) {
  try {
    const { syncFrequency, dataTypes, credentials } = req.body;

    // Verify the data source belongs to the user
    const dataSources = await dataIngestionService.getUserDataSources(userId);
    const dataSource = dataSources.find(ds => ds.id === dataSourceId);

    if (!dataSource) {
      return res.status(404).json({
        success: false,
        error: 'Data source not found'
      });
    }

    // Update credentials if provided
    if (credentials) {
      const credentialId = dataSource.credentials; // This should be the credential ID
      if (credentialId) {
        await credentialStorageService.updateCredentials(
          credentialId,
          userId,
          credentials
        );
      }
    }

    // Update sync frequency and data types
    const updates: any = {};
    if (syncFrequency) {
      updates.syncFrequency = syncFrequency;
    }
    if (dataTypes) {
      updates.dataTypes = dataTypes;
    }

    if (Object.keys(updates).length > 0) {
      await dataSourceRepository.update(dataSourceId, updates);
    }

    return res.status(200).json({
      success: true,
      message: 'Data source updated successfully'
    });
  } catch (error) {
    console.error('Failed to update data source:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update data source'
    });
  }
}

/**
 * Delete a data source
 */
async function handleDeleteDataSource(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  dataSourceId: string
) {
  try {
    // Verify the data source belongs to the user
    const dataSources = await dataIngestionService.getUserDataSources(userId);
    const dataSource = dataSources.find(ds => ds.id === dataSourceId);

    if (!dataSource) {
      return res.status(404).json({
        success: false,
        error: 'Data source not found'
      });
    }

    // Disconnect the data source (this will handle credential cleanup)
    const disconnected = await dataIngestionService.disconnectDataSource(dataSourceId);

    if (!disconnected) {
      return res.status(500).json({
        success: false,
        error: 'Failed to disconnect data source'
      });
    }

    // Delete the data source record
    await dataSourceRepository.delete(dataSourceId);

    // Clean up stored credentials
    if (dataSource.credentials) {
      await credentialStorageService.deleteCredentials(dataSource.credentials, userId);
    }

    return res.status(200).json({
      success: true,
      message: 'Data source deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete data source:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete data source'
    });
  }
}