import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, message: "Candidate ID is required" }, { status: 400 });
    }

    const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
    const COLLECTION = "applications"; // 👈 Change if your collection name is different

    // ✅ Firestore REST API endpoint for deleting a document
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${id}`;

    // Send DELETE request directly to Firestore
    const response = await fetch(url, { method: "DELETE" });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete document: ${errorText}`);
    }

    return NextResponse.json({ success: true, message: "Candidate deleted successfully" });
  } catch (error: any) {
    console.error("❌ Error deleting candidate:", error);
    return NextResponse.json(
      { success: false, message: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
