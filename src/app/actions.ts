'use server';

import { extractResumeData } from '@/ai/flows/resume-data-extraction';
import type { ExtractResumeDataInput } from '@/ai/flows/resume-data-extraction';

export async function parseResumeAction(input: ExtractResumeDataInput) {
  try {
    const extractedData = await extractResumeData(input);
    return { success: true, data: extractedData };
  } catch (error) {
    console.error('Error parsing resume:', error);
    return {
      success: false,
      error: 'Failed to parse resume. Please check the file and try again.',
    };
  }
}
