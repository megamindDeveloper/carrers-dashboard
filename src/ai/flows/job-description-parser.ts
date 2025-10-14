
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

export const JobDescriptionParserInputSchema = z.object({
  jobDescription: z
    .string()
    .describe('The full raw text of the job description to be parsed.'),
});
export type JobDescriptionParserInput = z.infer<typeof JobDescriptionParserInputSchema>;

const JobSectionSchema = z.object({
    title: z.string().describe("The title or heading of the section (e.g., 'Responsibilities', 'Qualifications')."),
    points: z.array(z.string()).describe("An array of bullet points or individual paragraphs under that section heading.")
});

export const JobDescriptionParserOutputSchema = z.object({
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
  prompt: `You are an expert at parsing job descriptions. Analyze the following text and structure it into sections. Each section should have a title (the heading) and an array of points (the bullet points or paragraphs under that heading).

  Guidelines:
  1. Identify distinct sections based on headings (e.g., "Responsibilities", "What You'll Do", "Requirements", "Skills", "Qualifications", "Benefits").
  2. For each section, capture all the bullet points or lines of text that belong to it.
  3. Combine related, fragmented bullet points into coherent sentences.
  4. Preserve the original meaning and detail.
  5. If there are no clear headings, try to infer logical sections.
  6. Return the data in the specified JSON format.

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
    const {output} = await jobDescriptionParserPrompt(input);
    return output!;
  }
);
