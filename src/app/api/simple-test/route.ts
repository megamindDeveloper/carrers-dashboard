import { NextResponse } from "next/server";
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

export async function GET() { // Use GET for easy testing in the browser
  try {
    const result = await sendEmail({
      to: { email: "jamshadconnect@gmail.com", name: "Test" },
      subject: "Test from an isolated route",
      htmlBody: "<h1>Did this work?</h1>",
    });

    return NextResponse.json({ success: true, message: "Email sent successfully from isolated route!", data: result });

  } catch (error: any) {
    console.error("Error in simple test route:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
