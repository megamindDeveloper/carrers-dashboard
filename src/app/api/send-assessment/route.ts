
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { sendEmail } from "@/lib/mail";
import type { CollegeCandidate } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { candidates, assessmentId, assessmentTitle, passcode, collegeId } = await req.json();

    if (!candidates || !Array.isArray(candidates) || candidates.length === 0 || !assessmentId || !assessmentTitle || !passcode || !collegeId) {
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
      .replace(/<<Passcode>>/g, passcode);

    let sentCount = 0;
    let failedCount = 0;

    for (const candidate of candidates) {
        // Replace candidate-specific placeholders
        let personalizedTemplate = template.replace(/<<Candidate Name>>/g, candidate.name)
                                           .replace(/<<Candidate ID>>/g, candidate.id); // Add candidate ID to the template

        const emailResult = await sendEmail({
            to: { email: candidate.email, name: candidate.name },
            subject: `Invitation to complete assessment for ${assessmentTitle}`,
            htmlBody: personalizedTemplate,
        });

        if (emailResult.success) {
            sentCount++;
        } else {
            failedCount++;
            console.error(`Failed to send email to ${candidate.email}:`, (emailResult as any).message);
        }
    }

    if (failedCount > 0) {
        return NextResponse.json({ 
            success: false, 
            message: `Process completed with errors. Sent: ${sentCount}, Failed: ${failedCount}. Check server logs for details.` 
        }, { status: 207 }); // 207 Multi-Status
    }

    return NextResponse.json({ success: true, message: `Assessment invitations sent to ${sentCount} candidates successfully.` });

  } catch (error: any) {
    console.error("Error processing assessment invitations:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
