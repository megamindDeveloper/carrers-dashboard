
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { sendEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    // Parse and validate request body
    const { fullName, email, position } = await req.json();
    if (
      !fullName || typeof fullName !== "string" ||
      !email || typeof email !== "string" ||
      !position || typeof position !== "string"
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid request body. Expect fullName, email, and position as strings." },
        { status: 400 }
      );
    }

    // Read HTML template
    const templatePath = path.join(process.cwd(), "src", "email-templates", "application-response-mail.html");
    let template: string;
    try {
      template = await fs.readFile(templatePath, "utf8");
    } catch (e) {
      console.error("Failed to read email template at:", templatePath, e);
      return NextResponse.json(
        { success: false, message: "Email template not found or unreadable." },
        { status: 500 }
      );
    }

    // Replace placeholders (support encoded and raw)
    template = template
      .replace(/&lt;&lt;Candidate Name&gt;&gt;/g, fullName)
      .replace(/&lt;&lt;Position&gt;&gt;/g, position)
      .replace(/<<Candidate Name>>/g, fullName)
      .replace(/<<Position>>/g, position);

    // Send the email using centralized helper
    await sendEmail({
      to: { email, name: fullName },
      subject: "Update on your application with Megamind Careers",
      htmlBody: template,
    });

    return NextResponse.json({ success: true, message: "Email sent successfully" });
    
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
