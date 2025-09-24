
import * as admin from 'firebase-admin';

// This function initializes the Firebase Admin SDK.
// It ensures that it's only initialized once.
export async function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
      throw new Error("The FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set. Please add it to your .env file.");
  }
  
  try {
      const serviceAccount = JSON.parse(serviceAccountJson);
       return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
  } catch (e) {
      throw new Error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON. Make sure it is a valid JSON string.");
  }

 
}
