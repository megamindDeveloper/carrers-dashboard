import { NextResponse } from 'next/server';
import { initializeAdminApp } from '@/app/utils/firebase/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const { id, resumeUrl } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Candidate ID is required' },
        { status: 400 }
      );
    }
    
    const adminApp = initializeAdminApp();
    const db = adminApp.firestore();
    const storage = adminApp.storage();

    // 1. Delete from Firestore
    await db.collection('applications').doc(id).delete();

    // 2. Delete from Storage (if resumeUrl exists)
    if (resumeUrl) {
      try {
        // Extract the file path from the full URL
        const decodedUrl = decodeURIComponent(resumeUrl);
        const path = decodedUrl.split('/o/')[1].split('?alt=media')[0];
        
        if (path) {
          const fileRef = storage.bucket().file(path);
          await fileRef.delete();
        }
      } catch (storageError) {
          // Log the storage error but don't fail the whole request
          // It's possible the file doesn't exist or rules are different
          console.warn(`Could not delete resume from storage: ${storageError}`);
      }
    }

    return NextResponse.json({ success: true, message: 'Candidate deleted successfully' });

  } catch (error: any) {
    console.error('Error deleting candidate:', error);
    // Check for specific initialization error
    if (error.message.includes('Firebase Admin SDK initialization failed')) {
      return NextResponse.json(
        { success: false, message: 'Server configuration error: Could not initialize Firebase Admin.' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { success: false, message: error.message || 'An unknown error occurred' },
      { status: 500 }
    );
  }
}
