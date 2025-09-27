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
  const smtpPassword = process.env.ZEPTO_PASS;

  if (!smtpPassword) {
    console.error("ZeptoMail SMTP password is not defined in environment variables.");
    throw new Error("Missing email configuration.");
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
    from: 'megamind <no-reply@megamind.studio>',
    to: to.email,
    subject: subject,
    html: htmlBody,
  };

  try {
    const info = await transport.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return { success: true };
  } catch (error) {
    console.error("Failed to send email:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to send email: ${error.message}`);
    }
    throw new Error("An unknown error occurred while sending the email.");
  }
}
