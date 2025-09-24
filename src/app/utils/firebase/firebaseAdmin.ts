import admin from 'firebase-admin';

// Since we are using ES modules, we need to import the JSON file differently.
// The `assert { type: 'json' }` is a standard way to do this.
import serviceAccount from '../../../../firebase-service-account.json';

// Ensure the service account has the correct structure for `cert`
// The `cert` function expects project_id, client_email, and private_key
const serviceAccountCredentials = {
  projectId: serviceAccount.project_id,
  clientEmail: serviceAccount.client_email,
  privateKey: serviceAccount.private_key,
};

export function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccountCredentials),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    // In a real app, you might want to throw this error
    // or handle it more gracefully.
    throw new Error('Firebase Admin SDK initialization failed.');
  }
}
