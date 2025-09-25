import * as admin from 'firebase-admin';

export async function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const envVar = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!envVar) {
    console.error("FATAL: The FIREBASE_SERVICE_ACCOUNT_JSON environment variable was NOT found!");
    throw new Error('The FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.');
  }
  
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(envVar);
  } catch(e: any) {
    console.error("FATAL: Could not parse FIREBASE_SERVICE_ACCOUNT_JSON. Make sure it is valid JSON.", e);
    throw new Error('Could not parse FIREBASE_SERVICE_ACCOUNT_JSON.');
  }

  // ✅ Fix newline issue in private key
  if (serviceAccount.private_key?.includes('\\n')) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  try {
    console.log("Attempting to initialize Firebase Admin SDK...");
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "carrers-21341.appspot.com",
    });
    console.log("Firebase Admin SDK initialized successfully.");
    return app;
  } catch (e: any) {
    console.error("FATAL: Admin init error:", e.message);
    if(e.code === 'app/duplicate-app') {
      console.log("Returning existing app instance.");
      return admin.app();
    }
    // Log the structure of the service account for debugging, but be careful with sensitive info.
    console.error("Service Account Keys (for debugging, redacted):", Object.keys(serviceAccount));
    throw new Error(`Failed to initialize Firebase Admin SDK: ${e.message}`);
  }
}
