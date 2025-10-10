import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { SendMailClient } from "zeptomail";

// ZeptoMail Configuration
const url = process.env.ZEPTOMAIL_URL || "https://api.zeptomail.in/";
const token = process.env.ZEPTOMAIL_TOKEN;

const client = token ? new SendMailClient({ url, token }) : null;

async function sendEmail({ to, subject, htmlBody }: { to: { email: string; name: string }; subject: string; htmlBody: string }) {
  if (!client) {
    throw new Error("ZeptoMail client is not initialized. Check server environment variables.");
  }
  return client.sendMail({
    from: {
      address: "no-reply@megamind.studio",
      name: "Megamind",
    },
    to: [
      {
        email_address: {
          address: to.email,
          name: to.name,
        },
      },
    ],
    subject,
    htmlbody: htmlBody,
  });
}

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

    await sendEmail({
        to: { email, name: fullName },
        subject: `Update on your application with Megamind`,
        htmlBody: template,
    });

    return NextResponse.json({ success: true, message: "Email sent successfully" });

  } catch (error: any) {
    console.error("Error processing rejection email:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
