'use server';

import { extractResumeData } from '@/ai/flows/resume-data-extraction';
import type { ExtractResumeDataInput } from '@/ai/flows/resume-data-extraction';
import { parseJobDescription } from '@/ai/flows/job-description-parser';
import type { JobDescriptionParserInput } from '@/ai/flows/job-description-parser';


export async function parseResumeAction(input: ExtractResumeDataInput) {
  try {
    const extractedData = await extractResumeData(input);
    return { success: true, data: extractedData };
  } catch (error: any) {
    console.error('Error parsing resume:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred while parsing the resume.',
    };
  }
}

export async function parseJobDescriptionAction(input: JobDescriptionParserInput) {
  try {
    const sections = await parseJobDescription(input);
    return { success: true, data: sections };
  } catch (error: any) {
    console.error('Error parsing job description:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred while parsing the job description.',
    };
  }
}
