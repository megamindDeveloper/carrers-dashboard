'use server';

import { extractResumeData } from '@/ai/flows/resume-data-extraction';
import type { ExtractResumeDataInput } from '@/ai/flows/resume-data-extraction';

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
