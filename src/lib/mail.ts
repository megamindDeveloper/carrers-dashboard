// lib/mail.ts

import { SendMailClient } from "zeptomail";

// 1. Get credentials from environment variables for security
const url = "https://api.zeptomail.in/";
const token = process.env.ZEPTOMAIL_TOKEN; // <-- IMPORTANT: Use environment variable

if (!token) {
  console.error("ZeptoMail token is not defined in environment variables.");
  // In a real app, you might want to prevent the app from starting
}else{
  // TEMPORARY DEBUGGING LINE - ADD THIS!
console.log("TOKEN LOADED IN lib/mail.ts:", token); 

}

// 2. Initialize the client ONCE and reuse it
const client = new SendMailClient({ url, token: token! });

// 3. Define the structure for the function's arguments using an interface
export interface SendEmailOptions {
  to: {
    email: string;
    name: string;
  };
  subject: string;
  htmlBody: string;
}

// 4. Create the generic, reusable email function
export async function sendEmail({ to, subject, htmlBody }: SendEmailOptions) {
  try {
    const response = await client.sendMail({
      from: {
        address: "no-reply@megamind.studio", // This can also be an environment variable
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
    
   
    return { success: true, data: response };

  } catch (error) {
    
    return { success: false, error: error };
  }
}