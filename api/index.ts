// Set Vercel environment variable BEFORE importing
// Don't override NODE_ENV - let Vercel set it
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
// CRITICAL: Import from source TypeScript, not built JavaScript
// Vercel will bundle this automatically
import { initPromise } from '../server/index';

// Cache the initialized app (only if successful)
let appReady: any = null;
let initError: any = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Wait for app initialization on first request
    if (!appReady && !initError) {
      try {
        appReady = await initPromise;
        console.log('Express app initialized successfully');
      } catch (error) {
        initError = error;
        throw error;
      }
    }
    
    // If initialization failed, throw the error
    if (initError) {
      throw initError;
    }
    
    // Now the app has all routes registered
    return appReady(req, res);
  } catch (error: any) {
    console.error('Serverless handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
