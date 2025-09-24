import * as admin from 'firebase-admin';

export async function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  console.log("-----------------------------------------");
  console.log("ATTEMPTING TO INITIALIZE FIREBASE ADMIN");
  const envVar = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!envVar) {
    console.error("FATAL: The FIREBASE_SERVICE_ACCOUNT_JSON environment variable was NOT found!");
    throw new Error('The FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.');
  }
  console.log("SUCCESS: Environment variable was found.");

  let serviceAccount = JSON.parse(envVar);

  // ✅ Fix newline issue in private key
  if (serviceAccount.private_key?.includes('\\n')) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  console.log("Service account keys:", Object.keys(serviceAccount));

  try {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "carrers-21341.appspot.com",
    });
  } catch (e: any) {
    console.error("Admin init error:", e);
    throw new Error(`Failed to initialize Firebase Admin SDK: ${e.message}`);
  }
}
