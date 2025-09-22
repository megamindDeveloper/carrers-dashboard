
import { NextResponse } from "next/server";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/app/utils/firebase/firebaseConfig";
import type { Job } from "@/lib/types";

// POST request to create a new job
export async function POST(req: Request) {
  try {
    const jobData: Omit<Job, 'id' | 'createdAt'> = await req.json();

    const newJob = {
      ...jobData,
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, "jobs"), newJob);

    return NextResponse.json({ success: true, message: "Job added successfully", id: docRef.id });
  } catch (error: any) {
    console.error("Error adding job:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}


// PUT request to update an existing job
export async function PUT(req: Request) {
    try {
      const { id, ...jobData } = await req.json();
  
      if (!id) {
        return NextResponse.json({ success: false, message: "Job ID is required for an update" }, { status: 400 });
      }
  
      const jobRef = doc(db, 'jobs', id);
      await updateDoc(jobRef, jobData);
  
      return NextResponse.json({ success: true, message: "Job updated successfully" });
    } catch (error: any) {
      console.error("Error updating job:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
  }

