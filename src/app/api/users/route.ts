
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/app/utils/firebase/adminConfig";

// POST request to create a new user
export async function POST(req: Request) {
  try {
    const { email, password, role, accessibleTabs } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const userRecord = await adminAuth.createUser({
      email,
      password,
    });
    
    await adminAuth.setCustomUserClaims(userRecord.uid, { role });

    const userDoc = {
      email,
      role,
      accessibleTabs: role === 'superAdmin' ? [] : accessibleTabs || [],
    };

    await adminDb.collection("users").doc(userRecord.uid).set(userDoc);

    return NextResponse.json({ success: true, uid: userRecord.uid, email: userRecord.email });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT request to update an existing user
export async function PUT(req: Request) {
    try {
      const { uid, role, accessibleTabs, password } = await req.json();
  
      if (!uid || !role) {
        return NextResponse.json({ success: false, error: "Missing required fields for update" }, { status: 400 });
      }

      if (password) {
          await adminAuth.updateUser(uid, { password });
      }
      
      await adminAuth.setCustomUserClaims(uid, { role });

      const userDoc = {
        role,
        accessibleTabs: role === 'superAdmin' ? [] : accessibleTabs || [],
      };
  
      await adminDb.collection("users").doc(uid).update(userDoc);
  
      return NextResponse.json({ success: true, uid, email: (await adminAuth.getUser(uid)).email });
    } catch (error: any) {
      console.error("Error updating user:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE request to delete a user
export async function DELETE(req: Request) {
    try {
      const { uid } = await req.json();
  
      if (!uid) {
        return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
      }

      // Delete from Firebase Auth
      await adminAuth.deleteUser(uid);
      
      // Delete from Firestore
      await adminDb.collection('users').doc(uid).delete();
  
      return NextResponse.json({ success: true, message: "User deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
