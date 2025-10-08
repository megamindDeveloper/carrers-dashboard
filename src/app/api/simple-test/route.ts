import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mail"; // Assuming your helper is here

export async function GET() { // Use GET for easy testing in the browser
  try {
    const result = await sendEmail({
      to: { email: "jamshadconnect@gmail.com", name: "Test" },
      subject: "Test from an isolated route",
      htmlBody: "<h1>Did this work?</h1>",
    });

    if (!result.success) {
      console.error("Simple test failed:", result.error);
      return NextResponse.json({ message: "Failed", error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Email sent successfully from isolated route!" });

  } catch (error: any) {
    console.error("Error in simple test route:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}