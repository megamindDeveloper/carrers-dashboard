

import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mail";
import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "@/app/utils/firebase/firebaseConfig";
import path from "path";
import fs from "fs/promises";
import type { AuthenticationType } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { candidates, assessmentId, assessmentTitle, passcode, collegeId, subject, body, authentication } = await req.json();

    if (!candidates || !Array.isArray(candidates) || candidates.length === 0 || !assessmentId || !assessmentTitle || !subject || !body) {
      return NextResponse.json(
        { success: false, message: "Invalid request body. Missing required fields." },
        { status: 400 }
      );
    }
    
    // Path to your template file
    const templatePath = path.join(process.cwd(), "src", "email-templates", "assessment-invite-mail.html");
    const baseTemplate = await fs.readFile(templatePath, "utf8");

    let sentCount = 0;
    let failedCount = 0;
    const failedReasons: string[] = [];
    const batch = writeBatch(db);

    for (const candidate of candidates) {
      try {
        let personalizedTemplate = baseTemplate;

        // Create a unique link for each candidate
        let assessmentLink = `${process.env.NEXT_PUBLIC_BASE_URL}/assessment/${assessmentId}?candidateId=${candidate.id}`;
        if (collegeId) {
            assessmentLink += `&collegeId=${collegeId}`;
        }

        let finalBody = body;
        if (authentication === 'email_verification') {
            finalBody = `Please note: You will need to verify your name and email address to access this assessment.\n\n${body}`;
        }

        // Replace all placeholders for the specific candidate
        personalizedTemplate = personalizedTemplate
          .replace(/<<Candidate Name>>/g, candidate.name)
          .replace(/<<Assessment Name>>/g, assessmentTitle)
          .replace(/<<Assessment Link>>/g, assessmentLink)
          .replace(/<<Passcode>>/g, passcode || 'N/A')
          .replace(/<<EMAIL_BODY>>/g, finalBody.replace(/\n/g, '<br />')); // Replace custom body content


        // Conditionally show passcode section
        if (passcode) {
            personalizedTemplate = personalizedTemplate.replace(/<!-- IF passcode -->/g, '').replace(/<!-- ENDIF passcode -->/g, '');
        } else {
            const passcodeSectionRegex = /<!-- IF passcode -->(.|\n)*?<!-- ENDIF passcode -->/g;
            personalizedTemplate = personalizedTemplate.replace(passcodeSectionRegex, '');
        }

        await sendEmail({
            to: { email: candidate.email, name: candidate.name },
            subject: subject,
            htmlBody: personalizedTemplate,
        });

        // Add a record of this invitation
        const invitationRef = doc(collection(db, 'assessmentInvitations'));
        batch.set(invitationRef, {
            candidateId: candidate.id,
            candidateEmail: candidate.email,
            assessmentId,
            assessmentTitle,
            sentAt: new Date(),
        });

        sentCount++;
      } catch (emailError: any) {
        failedCount++;
        const reason = `Failed to send to ${candidate.email}: ${emailError.message}`;
        console.error(reason);
        failedReasons.push(reason);
      }
    }
    
    // Commit batch of invitation records
    await batch.commit();

    if (failedCount > 0) {
      const errorMessage = `Process completed with errors. Sent: ${sentCount}, Failed: ${failedCount}. Reasons: ${failedReasons.join(', ')}`;
      // If all emails failed, it's a server error. If only some, it's a multi-status.
      const status = sentCount === 0 ? 500 : 207;
      return NextResponse.json({ 
          success: false, 
          message: errorMessage
      }, { status });
    }

    return NextResponse.json({ success: true, message: `Assessment invitations sent to ${sentCount} candidates successfully.` });

  } catch (error: any) {
    console.error("Error processing assessment invitations:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
