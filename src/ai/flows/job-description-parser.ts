
'use server';

/**
 * @fileOverview This flow parses a job description text into structured sections.
 *
 * - parseJobDescription - A function that parses the job description.
 * - JobDescriptionParserInput - The input type for the parseJobDescription function.
 * - JobDescriptionParserOutput - The return type for the parseJobDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const JobDescriptionParserInputSchema = z.object({
  jobDescription: z
    .string()
    .describe('The full raw text of the job description to be parsed.'),
});
export type JobDescriptionParserInput = z.infer<typeof JobDescriptionParserInputSchema>;

const JobSectionSchema = z.object({
    title: z.string().describe("The title or heading of the section (e.g., 'Responsibilities', 'Qualifications')."),
    points: z.array(z.string()).describe("An array of bullet points or individual paragraphs under that section heading.")
});

const JobDescriptionParserOutputSchema = z.object({
    highlightPoints: z.array(z.string()).optional().describe("An array of bullet points from a 'Highlights' section."),
    sections: z.array(JobSectionSchema)
});
export type JobDescriptionParserOutput = z.infer<typeof JobDescriptionParserOutputSchema>;


export async function parseJobDescription(
  input: JobDescriptionParserInput
): Promise<JobDescriptionParserOutput> {
  return parseJobDescriptionFlow(input);
}

const jobDescriptionParserPrompt = ai.definePrompt({
  name: 'jobDescriptionParserPrompt',
  input: {schema: JobDescriptionParserInputSchema},
  output: {schema: JobDescriptionParserOutputSchema},
  prompt: `You are an expert at parsing job descriptions into structured JSON.
Analyze the following job description text and structure it.

IMPORTANT RULES:
1.  If you find a section titled "Highlights" or similar, extract its bullet points into the 'highlightPoints' array.
2.  For all other sections that describe the job itself (like "Responsibilities", "Required Skills", "Qualifications", "Requirements", "What You'll Do"), parse them into the 'sections' array. Each item in 'sections' must have a 'title' and an array of 'points'.
3.  EXCLUDE any general company information, "About Us" sections, "Why Work Here" sections, or any other content that doesn't describe the role's duties or qualifications.

Job Description Text:
'''
{{{jobDescription}}}
'''
`,
});

const parseJobDescriptionFlow = ai.defineFlow(
  {
    name: 'parseJobDescriptionFlow',
    inputSchema: JobDescriptionParserInputSchema,
    outputSchema: JobDescriptionParserOutputSchema,
  },
  async input => {
    const {output} = await parseJobDescriptionAction(input);
    if (!output) {
      throw new Error('AI response was empty.');
    }
    return output;
  }
);
