
import { NextResponse } from "next/server";
import { doc, deleteDoc, getDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "@/app/utils/firebase/firebaseConfig";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Candidate ID is required." },
        { status: 400 }
      );
    }

    const docRef = doc(db, "applications", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, message: "Candidate not found." },
        { status: 404 }
      );
    }

    const candidateData = docSnap.data();
    const resumeUrl = candidateData.resumeUrl;

    // Delete the document from Firestore
    await deleteDoc(docRef);

    // If there's a resume URL, try to delete the file from Storage
    if (resumeUrl) {
      try {
        const storageRef = ref(storage, resumeUrl);
        await deleteObject(storageRef);
      } catch (storageError: any) {
        // Log the storage error but don't fail the entire request,
        // as the primary goal (deleting the DB record) was successful.
        console.warn(`Failed to delete resume from storage: ${storageError.message}`);
        // This could happen if the file doesn't exist or permissions are wrong.
      }
    }

    return NextResponse.json({
      success: true,
      message: "Candidate deleted successfully.",
    });
  } catch (error: any) {
    console.error("Error deleting candidate:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
