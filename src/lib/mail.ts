// File: lib/mail.ts
import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: {
    email: string;
    name: string;
  };
  subject: string;
  htmlBody: string;
}

export async function sendEmail({ to, subject, htmlBody }: SendEmailOptions) {
  // 1. Get credentials from environment variables
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpFrom) {
    const errorMessage = "Email environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM) are not configured. Cannot send email.";
    console.error(errorMessage);
    // Throw an error to be caught by the calling API route
    throw new Error(errorMessage);
  }

  // 2. Create a transporter object
  const transport = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    secure: parseInt(smtpPort, 10) === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  // 3. Define mail options
  const mailOptions = {
    from: `"MegaMind Careers" <${smtpFrom}>`,
    to: to.email,
    subject: subject,
    html: htmlBody,
  };

  // 4. Send the email
  try {
    await transport.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to.email}`);
    return { success: true };
  } catch (error) {
    console.error(`Error sending email to ${to.email}:`, error);
    // Throw a generic error to be caught by the API route
    throw new Error('An error occurred while sending the email.');
  }
}
