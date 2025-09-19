
'use server';

/**
 * @fileOverview This flow extracts data from a resume file.
 *
 * - extractResumeData - A function that extracts resume data.
 * - ExtractResumeDataInput - The input type for the extractResumeData function.
 * - ExtractResumeDataOutput - The return type for the extractResumeData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractResumeDataInputSchema = z.object({
  resumeDataUri: z
    .string()
    .describe(
      'The resume file content as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' /* e.g., application/pdf */
    ),
});
export type ExtractResumeDataInput = z.infer<typeof ExtractResumeDataInputSchema>;

const ExtractResumeDataOutputSchema = z.object({
  fullName: z.string().describe('The full name of the candidate.'),
  email: z.string().email().describe('The email address of the candidate.'),
  phone: z.string().describe('The phone number of the candidate.'),
  location: z.string().describe('The location of the candidate, including city and state.'),
  address: z.string().describe('The full mailing address of the candidate.'),
  education: z.string().describe('The education details of the candidate.'),
  experience: z.string().describe('The work or internship experience of the candidate.'),
});
export type ExtractResumeDataOutput = z.infer<typeof ExtractResumeDataOutputSchema>;

export async function extractResumeData(
  input: ExtractResumeDataInput
): Promise<ExtractResumeDataOutput> {
  return extractResumeDataFlow(input);
}

const resumeDataExtractionPrompt = ai.definePrompt({
  name: 'resumeDataExtractionPrompt',
  input: {schema: ExtractResumeDataInputSchema},
  output: {schema: ExtractResumeDataOutputSchema},
  prompt: `You are an AI assistant that extracts information from resumes.

  Analyze the following resume and extract the following information:
  - Full Name
  - Email Address
  - Phone Number
  - Location (City, State)
  - Address
  - Education
  - Experience (Work and/or Internship)

  Resume: {{media url=resumeDataUri}}

  Return the information in JSON format.`,
});

const extractResumeDataFlow = ai.defineFlow(
  {
    name: 'extractResumeDataFlow',
    inputSchema: ExtractResumeDataInputSchema,
    outputSchema: ExtractResumeDataOutputSchema,
  },
  async input => {
    const {output} = await resumeDataExtractionPrompt(input);
    return output!;
  }
);
