// Vercel serverless function to exchange Firebase ID tokens for custom tokens
// Place this file at: api/auth/exchange-token.ts (or .js)

// You'll need to install firebase-admin: npm install firebase-admin
// And set these environment variables in Vercel:
// - FIREBASE_PROJECT_ID
// - FIREBASE_CLIENT_EMAIL  
// - FIREBASE_PRIVATE_KEY (from Firebase service account)

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App | undefined;

// Initialize Firebase Admin
if (!getApps().length) {
  try {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: 'ID token is required' });
  }

  if (!adminApp) {
    return res.status(500).json({ error: 'Firebase Admin not initialized' });
  }

  try {
    // Verify the ID token
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Create a custom token for this user
    const customToken = await getAuth().createCustomToken(uid);

    return res.status(200).json({ customToken });
  } catch (error: any) {
    console.error('Token exchange error:', error);
    return res.status(401).json({ error: error.message || 'Invalid token' });
  }
}
