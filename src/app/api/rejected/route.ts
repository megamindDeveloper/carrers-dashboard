import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { sendEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const { fullName, email, position } = await req.json();
    
    // Path to your template file
    const templatePath = path.join(process.cwd(), "src", "email-templates", "rejection-mail.html");
    
    // Read the template
    let template = await fs.readFile(templatePath, "utf8");

    // Replace placeholders with actual values
    template = template
      .replace(/<<Candidate Name>>/g, fullName)
      .replace(/<<Position>>/g, position);

    // Send email using the updated mail library
    await sendEmail({
        to: { email, name: fullName },
        subject: `Update on your application with megamind`,
        htmlBody: template,
    });

    return NextResponse.json({ success: true, message: "Email sent successfully" });

  } catch (error: any) {
    console.error("Error processing rejection email:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
