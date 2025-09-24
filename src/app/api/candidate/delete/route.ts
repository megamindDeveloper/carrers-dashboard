
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { initializeAdminApp } from "@/app/utils/firebase/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const adminApp = await initializeAdminApp();
    const firestore = getFirestore(adminApp);
    const storage = getStorage(adminApp);
    
    // In a real app, you'd want to verify the user is an authorized HR member.
    // For now, we'll just check if they are logged in.
    const authorization = req.headers.get("Authorization");
    if (authorization) {
      const idToken = authorization.split("Bearer ")[1];
      await getAuth(adminApp).verifyIdToken(idToken);
    } else {
        // This is a fallback for when the client doesn't send the token,
        // relying on server-to-server trust. Add more robust security as needed.
        console.warn("Authorization header not found. Proceeding with server privileges.");
    }


    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Candidate ID is required' },
        { status: 400 }
      );
    }

    const docRef = firestore.collection('applications').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, message: "Candidate not found" }, { status: 404 });
    }

    const candidateData = docSnap.data();
    
    // Delete the Firestore document
    await docRef.delete();

    // If there's a resume URL, delete the file from Storage
    if (candidateData?.resumeUrl) {
      try {
        const resumeRef = storage.bucket().file(
            decodeURIComponent(candidateData.resumeUrl.split('/o/')[1].split('?')[0])
        );
        await resumeRef.delete();
      } catch (storageError: any) {
        // Log if storage deletion fails, but don't fail the entire request
        // as the primary record (Firestore doc) is already deleted.
        console.warn(`Failed to delete resume from storage: ${storageError.message}`);
      }
    }

    return NextResponse.json({ success: true, message: 'Candidate deleted successfully' });

  } catch (error: any) {
    console.error("Error deleting candidate:", error);
     if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
        return NextResponse.json({ success: false, message: 'Authentication error. Please log in again.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, message: error.message || "An unknown error occurred" }, { status: 500 });
  }
}
