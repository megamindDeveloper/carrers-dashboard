
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
    const { candidateName, candidateEmail, assessmentName, assessmentLink, subject, body } = await req.json();
    
    if (!candidateName || !candidateEmail || !assessmentName || !assessmentLink || !subject || !body) {
        return NextResponse.json({ success: false, message: "Missing required fields for sending reset email." }, { status: 400 });
    }

    const templatePath = path.join(process.cwd(), "src", "email-templates", "reset-assessment-mail.html");
    let template = await fs.readFile(templatePath, "utf8");

    template = template
      .replace(/<<Candidate Name>>/g, candidateName)
      .replace(/<<Assessment Name>>/g, assessmentName)
      .replace(/<<Assessment Link>>/g, assessmentLink)
      .replace(/<<EMAIL_BODY>>/g, body);

    await sendEmail({
        to: { email: candidateEmail, name: candidateName },
        subject: subject,
        htmlBody: template,
    });

    return NextResponse.json({ success: true, message: "Reset notification email sent successfully." });

  } catch (error: any) {
    console.error("Error sending reset email:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
