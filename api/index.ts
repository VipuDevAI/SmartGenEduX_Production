// Set Vercel environment variable BEFORE importing
process.env.VERCEL = '1';
import type { VercelRequest, VercelResponse } from '@vercel/node';
// Cache the initialized app
let appReady: any = null;
let initError: any = null;
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Initialize app on first request
    if (!appReady && !initError) {
      try {
        // Import from the compiled server bundle (tsup output)
        const { initPromise } = await import('../dist/server/index.js');
        appReady = await initPromise;
        console.log('Express app initialized successfully on Vercel');
      } catch (error) {
        console.error('App initialization error:', error);
        initError = error;
        throw error;
      }
    }
    
    // If initialization failed, throw the error
    if (initError) {
      throw initError;
    }
    
    // Handle the request with Express app
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
