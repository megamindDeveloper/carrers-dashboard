import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { fullName, email, position } = await req.json();

    // NOTE: You must configure SMTP_USER and SMTP_PASS in your .env file
    // for this to work.
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP credentials not found. Skipping email.');
      return NextResponse.json({ success: true, message: "Email skipped, SMTP not configured" });
    }
    
    // Path to your template file
    const templatePath = path.join(process.cwd(), "src", "email-templates", "application-response-mail.html");
    
    // Read the template
    let template = await fs.readFile(templatePath, "utf8");

    // Replace placeholders with actual values
    template = template
      .replace("<<Candidate Name>>", fullName)
      .replace("<<Position>>", position);

    // Setup nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "Gmail", // or other SMTP config
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Send email
    await transporter.sendMail({
      from: `"MegaMind Careers" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Update on your application with MegaMind Careers",
      html: template,
    });

    return NextResponse.json({ success: true, message: "Email sent successfully" });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

    