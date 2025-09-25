
import { NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeAdminApp } from "@/app/utils/firebase/firebaseAdmin";
import type { Job } from "@/lib/types";


// POST request to create a new job
export async function POST(req: Request) {
  try {
    await initializeAdminApp();
    const firestore = getFirestore();
    const jobData: Omit<Job, 'id' | 'createdAt'> = await req.json();

    const newJob = {
      ...jobData,
      createdAt: FieldValue.serverTimestamp(),
    };
    
    const docRef = await firestore.collection("jobs").add(newJob);

    return NextResponse.json({ success: true, message: "Job added successfully", id: docRef.id });
  } catch (error: any) {
    console.error("Error adding job:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}


// PUT request to update an existing job
export async function PUT(req: Request) {
    try {
      await initializeAdminApp();
      const firestore = getFirestore();
      const { id, ...jobData } = await req.json();
  
      if (!id) {
        return NextResponse.json({ success: false, message: "Job ID is required for an update" }, { status: 400 });
      }
  
      const jobRef = firestore.collection('jobs').doc(id);
      await jobRef.update(jobData);
  
      return NextResponse.json({ success: true, message: "Job updated successfully" });
    } catch (error: any) {
      console.error("Error updating job:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
  }
