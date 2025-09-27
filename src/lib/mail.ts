
// File: lib/mail.ts

import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: {
    email: string;
    name: string;
  };
  subject: string;
  htmlBody: string;
}

export async function sendEmail({ to, subject, htmlBody }: SendEmailOptions) {
  // Use environment variables for security!
  const smtpPassword = process.env.ZEPTO_PASS;

  if (!smtpPassword) {
    console.error("ZeptoMail SMTP password is not defined in environment variables.");
    // In a real app, you might want to throw an error or handle this more gracefully
    return { success: false, error: "Missing email configuration." };
  }

  const transport = nodemailer.createTransport({
    host: "smtp.zeptomail.in",
    port: 587,
    auth: {
      user: "emailapikey",
      pass: smtpPassword,
    }
  });

  const mailOptions = {
    from: 'megamind <no-reply@megamind.studio>', // Use a proper "from" name
    to: to.email,
    subject: subject,
    html: htmlBody,
  };

  try {
    // Wrap the sendMail callback in a Promise for better async/await handling
    const info = await new Promise<any>((resolve, reject) => {
      transport.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email via transport:", error);
          return reject(error);
        }
        console.log('Email sent successfully:', info.response);
        resolve(info);
      });
    });

    return { success: true };

  } catch (error) {
    console.error("Failed to send email:", error);
    // Return a more structured error response
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}
