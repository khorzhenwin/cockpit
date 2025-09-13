// OAuth flow initiation and callback handling

import { NextApiRequest, NextApiResponse } from 'next';
import { DataIngestionService, DATA_SOURCE_PROVIDERS } from '../../../../lib/services/dataIngestion';
import { authenticateRequest } from '../../../../lib/security/auth';
import { DataSourceRepository } from '../../../../lib/repositories/dataSourceRepository';

// Initialize services
const dataSourceRepository = new DataSourceRepository();
const dataIngestionService = new DataIngestionService(dataSourceRepository);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { provider } = req.query;
    if (!provider || typeof provider !== 'string') {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // Check if provider is supported
    if (!DATA_SOURCE_PROVIDERS[provider]) {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    switch (req.method) {
      case 'GET':
        return await handleOAuthInitiation(req, res, provider);
      case 'POST':
        return await handleOAuthCallback(req, res, provider);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('OAuth API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Initiate OAuth flow
 */
async function handleOAuthInitiation(
  req: NextApiRequest,
  res: NextApiResponse,
  provider: string
) {
  try {
    // Authenticate the request
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate OAuth URL
    const { authUrl, state } = await dataIngestionService.initiateOAuthFlow(
      user.id,
      provider
    );

    // Store state in session or database for verification
    // For now, we'll return it to the client to handle
    return res.status(200).json({
      success: true,
      authUrl,
      state
    });
  } catch (error) {
    console.error('Failed to initiate OAuth flow:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to initiate OAuth flow'
    });
  }
}

/**
 * Handle OAuth callback
 */
async function handleOAuthCallback(
  req: NextApiRequest,
  res: NextApiResponse,
  provider: string
) {
  try {
    // Authenticate the request
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { code, state } = req.body;
    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code or state'
      });
    }

    // Complete OAuth flow
    const connectionResult = await dataIngestionService.completeOAuthFlow(
      user.id,
      provider,
      code,
      state
    );

    if (!connectionResult.success) {
      return res.status(400).json({
        success: false,
        error: connectionResult.error
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OAuth flow completed successfully',
      connectionId: connectionResult.connectionId,
      capabilities: connectionResult.capabilities
    });
  } catch (error) {
    console.error('Failed to complete OAuth flow:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to complete OAuth flow'
    });
  }
}