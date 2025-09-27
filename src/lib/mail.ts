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

// export async function sendEmail({ to, subject, htmlBody }: SendEmailOptions) {

//   try {
//     var nodemailer = require('nodemailer');
//     var transport = nodemailer.createTransport({
//       host: "smtp.zeptomail.in",
//       port: 587,
//       auth: {
//         user: "emailapikey",
//         pass: "PHtE6r1bS+DjjmErpBkH5KC7HpOgMN59/b9jfVMUtIdBX/BRH01Qo48ulzS/+B54VKZGRvCcwYxtuOnKte2BJGy5YGYaWGqyqK3sx/VYSPOZsbq6x00btVQccELdVIDrdtNq1yzVudnZNA=="
//       }
//     });

//     var mailOptions = {
//       from: '<no-reply@megamind.studio>',
    
//       to: to.email,
//       subject: subject,
//       html:htmlBody,
//     };

//     transport.sendMail(mailOptions, (error, info) => {
//       if (error) {
//         return console.log(error);
//       }
//       console.log('Successfully sent');
//     });
//   } catch (error) {
//     console.log("Error sending email:", error);
//     return { success: false, error: error };
//   }
// }
export async function sendEmail({ to, subject, htmlBody }: SendEmailOptions) {
  // Use environment variables for security!
  const smtpPassword = process.env.ZEPTO_PASS;

  if (!smtpPassword) {
    console.error("ZeptoMail SMTP password is not defined in environment variables.");
    return { success: false, error: "Missing email configuration." };
  }

  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({
    host: "smtp.zeptomail.in",
    port: 587,
    auth: {
              user: "emailapikey",
              pass: "PHtE6r1bS+DjjmErpBkH5KC7HpOgMN59/b9jfVMUtIdBX/BRH01Qo48ulzS/+B54VKZGRvCcwYxtuOnKte2BJGy5YGYaWGqyqK3sx/VYSPOZsbq6x00btVQccELdVIDrdtNq1yzVudnZNA=="
            }
  });

  const mailOptions = {
    from: 'megamind <no-reply@megamind.studio>', // Use a proper "from" name
    to: to.email,
    subject: subject,
    html: htmlBody,
  };

  try {
    // Wrap the sendMail callback in a Promise
    await new Promise((resolve, reject) => {
      transport.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
          reject(error); // Reject the promise if there's an error
        } else {
          console.log('Email sent successfully:', info.response);
          resolve(info); // Resolve the promise on success
        }
      });
    });

    return { success: true };

  } catch (error) {
    // This will now catch errors from the Promise
    console.error("Failed to send email:", error);
    return { success: false, error: error };
  }
}