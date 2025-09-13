// Data source synchronization API

import { NextApiRequest, NextApiResponse } from 'next';
import { DataIngestionService } from '../../../../lib/services/dataIngestion';
import { authenticateRequest } from '../../../../lib/security/auth';
import { DataSourceRepository } from '../../../../lib/repositories/dataSourceRepository';
import { CredentialRepository } from '../../../../lib/repositories/credentialRepository';

// Initialize services
const dataSourceRepository = new DataSourceRepository();
const credentialRepository = new CredentialRepository();
const dataIngestionService = new DataIngestionService(dataSourceRepository);

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
      case 'POST':
        return await handleSyncDataSource(req, res, user.id, id);
      default:
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Data source sync API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Trigger data synchronization for a specific data source
 */
async function handleSyncDataSource(
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

    // Check if data source is connected
    if (dataSource.status !== 'connected') {
      return res.status(400).json({
        success: false,
        error: `Data source is not connected. Status: ${dataSource.status}`
      });
    }

    // Trigger synchronization
    const syncResult = await dataIngestionService.syncData(dataSourceId);

    if (!syncResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Synchronization failed',
        details: {
          errors: syncResult.errors,
          recordsProcessed: syncResult.recordsProcessed
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Data synchronization completed successfully',
      result: {
        recordsProcessed: syncResult.recordsProcessed,
        recordsCreated: syncResult.recordsCreated,
        recordsUpdated: syncResult.recordsUpdated,
        lastSyncTime: syncResult.lastSyncTime,
        errors: syncResult.errors
      }
    });
  } catch (error) {
    console.error('Failed to sync data source:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to synchronize data source'
    });
  }
}