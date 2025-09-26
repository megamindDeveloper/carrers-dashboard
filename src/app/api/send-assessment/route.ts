
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { sendEmail } from "@/lib/mail";
import type { CollegeCandidate } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { candidates, assessmentId, assessmentTitle, passcode, collegeId } = await req.json();

    if (!candidates || !Array.isArray(candidates) || candidates.length === 0 || !assessmentId || !assessmentTitle || !collegeId) {
      return NextResponse.json(
        { success: false, message: "Invalid request body. Missing required fields." },
        { status: 400 }
      );
    }
    
    // Path to your template file
    const templatePath = path.join(process.cwd(), "src", "email-templates", "assessment-invite-mail.html");
    
    // Read the template
    let template = await fs.readFile(templatePath, "utf8");

    // Pass collegeId as a query param in the assessment link
    const assessmentLink = `${process.env.NEXT_PUBLIC_BASE_URL}/assessment/${assessmentId}?collegeId=${collegeId}`;


    // Replace template-wide placeholders
    template = template
      .replace(/<<Assessment Name>>/g, assessmentTitle)
      .replace(/<<Assessment Link>>/g, assessmentLink)
      .replace(/<<Passcode>>/g, passcode || 'N/A');

    // Conditionally show passcode section
    if (passcode) {
        template = template.replace('<!-- IF passcode -->', '').replace('<!-- ENDIF passcode -->', '');
    } else {
        const passcodeSectionRegex = /<!-- IF passcode -->(.|\n)*?<!-- ENDIF passcode -->/;
        template = template.replace(passcodeSectionRegex, '');
    }


    let sentCount = 0;
    let failedCount = 0;
    const failedReasons: string[] = [];

    for (const candidate of candidates) {
      try {
        // Replace candidate-specific placeholders
        let personalizedTemplate = template.replace(/<<Candidate Name>>/g, candidate.name)
                                           .replace(/<<Candidate ID>>/g, candidate.id);

        await sendEmail({
            to: { email: candidate.email, name: candidate.name },
            subject: `Invitation to complete assessment for ${assessmentTitle}`,
            htmlBody: personalizedTemplate,
        });
        sentCount++;
      } catch (emailError: any) {
        failedCount++;
        const reason = `Failed to send to ${candidate.email}: ${emailError.message}`;
        console.error(reason);
        failedReasons.push(reason);
      }
    }

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
