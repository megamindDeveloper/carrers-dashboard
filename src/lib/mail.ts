// File: lib/mail.ts

import { SendMailClient } from "zeptomail";

// 1. Get credentials
const url = "https://api.zeptomail.in/";
// 👇 FIX: Load the token securely from the environment variable
const token = process.env.ZEPTOMAIL_TOKEN;
console.log("ZEPTOMAIL TOKEN LOADED:", token);

if (!token) {
  throw new Error("ZeptoMail token is not defined in environment variables. The application cannot send emails.");
}

// 2. Initialize the client ONCE and reuse it
const client = new SendMailClient({ url, token });

// ... (the rest of your sendEmail function does not need to change) ...

export interface SendEmailOptions {
  to: {
    email: string;
    name: string;
  };
  subject: string;
  htmlBody: string;
}

export async function sendEmail({ to, subject, htmlBody }: SendEmailOptions) {
  try {
    const response = await client.sendMail({
      bounce_address: "no-reply@megamind.studio",
      from: {
        address: "no-reply@megamind.studio",
        name: "megamind",
      },
      to: [
        {
          email_address: {
            address: to.email,
            name: to.name,
          },
        },
      ],
      subject: subject,
      htmlbody: htmlBody,
    });
    
    console.log("Email sent successfully:", response);
    return { success: true, data: response };

  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error };
  }
}