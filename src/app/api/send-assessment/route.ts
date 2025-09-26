
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mail";
import type { CollegeCandidate } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { candidates, assessmentId, assessmentTitle, passcode, collegeId, subject, htmlBody } = await req.json();

    if (!candidates || !Array.isArray(candidates) || candidates.length === 0 || !assessmentId || !assessmentTitle || !collegeId || !subject || !htmlBody) {
      return NextResponse.json(
        { success: false, message: "Invalid request body. Missing required fields." },
        { status: 400 }
      );
    }
    
    // Use the htmlBody from the request instead of reading a file
    const baseTemplate = htmlBody;

    let sentCount = 0;
    let failedCount = 0;
    const failedReasons: string[] = [];

    for (const candidate of candidates) {
      try {
        let personalizedTemplate = baseTemplate;

        // Create a unique link for each candidate
        const assessmentLink = `${process.env.NEXT_PUBLIC_BASE_URL}/assessment/${assessmentId}?collegeId=${collegeId}&candidateId=${candidate.id}`;

        // Replace all placeholders for the specific candidate
        personalizedTemplate = personalizedTemplate
          .replace(/<<Candidate Name>>/g, candidate.name)
          .replace(/<<Candidate ID>>/g, candidate.id)
          .replace(/<<Assessment Name>>/g, assessmentTitle)
          .replace(/<<Assessment Link>>/g, assessmentLink)
          .replace(/<<Passcode>>/g, passcode || 'N/A');

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
