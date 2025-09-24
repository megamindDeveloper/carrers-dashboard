
import * as admin from 'firebase-admin';
import serviceAccount from '../../../../firebase-service-account.json';

// This function initializes the Firebase Admin SDK.
// It ensures that it's only initialized once.
export async function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Type cast to the ServiceAccount interface for type safety
  const serviceAccountParams = serviceAccount as admin.ServiceAccount;
  
  try {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccountParams),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (e: any) {
    throw new Error(`Failed to initialize Firebase Admin SDK: ${e.message}`);
  }
}
