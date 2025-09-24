import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { sendEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const { fullName, email, position } = await req.json();
    
    // Path to your template file
    const templatePath = path.join(process.cwd(), "src", "email-templates", "application-response-mail.html");
    
    // Read the template
    let template = await fs.readFile(templatePath, "utf8");

    // Replace placeholders with actual values
    template = template
      .replace(/&lt;&lt;Candidate Name&gt;&gt;/g, fullName)
      .replace(/&lt;&lt;Position&gt;&gt;/g, position);

    const emailResult = await sendEmail({
        to: { email, name: fullName },
        subject: "Update on your application with MegaMind Careers",
        htmlBody: template,
    });


    if (emailResult.success) {
        return NextResponse.json({ success: true, message: "Email sent successfully" });
    } else {
        const message = (emailResult as any).message || "Failed to send email";
        console.error("Error sending email:", (emailResult as any).error || message);
        return NextResponse.json({ success: false, message }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
