import { SendMailClient } from "zeptomail";

// Define the structure for the function's arguments using an interface
export interface SendEmailOptions {
  to: {
    email: string;
    name: string;
  };
  subject: string;
  htmlBody: string;
}

// Create the generic, reusable email function
export async function sendEmail({ to, subject, htmlBody }: SendEmailOptions) {
  // Get credentials from environment variables for security
  const url = "https://api.zeptomail.in/";
  const token = process.env.ZEPTOMAIL_TOKEN;

  // Check for the token on each call
  if (!token) {
    const errorMessage = "Email could not be sent. The ZeptoMail token is not configured on the server.";
    console.error(errorMessage);
    return { success: false, message: errorMessage };
  }

  // Initialize the client inside the function for reliability in serverless environments
  const client = new SendMailClient({ url, token });

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
    console.error("ZeptoMail send error:", error);
    // Return a structured error
    return { success: false, error: (error as Error).message || "An unknown error occurred while sending the email." };
  }
}
