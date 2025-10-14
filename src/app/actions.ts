
'use server';

import { extractResumeData } from '@/ai/flows/resume-data-extraction';
import type { ExtractResumeDataInput } from '@/ai/flows/resume-data-extraction';
import { parseJobDescription } from '@/ai/flows/job-description-parser';
import { suggestIcon } from '@/ai/flows/icon-suggester';

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

export async function parseJobDescriptionAction(input: { jobDescription: string }) {
  try {
    const result = await parseJobDescription(input);
    if (!result || !result.sections) {
        throw new Error('AI response was empty or in an unexpected format.');
    }
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error parsing job description:', error);
    return {
      success: false,
      error: `AI parsing failed: ${error.message}` || 'An unknown error occurred while parsing the job description.',
    };
  }
}


export async function suggestIconAction(input: { jobTitle: string }): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const result = await suggestIcon(input);
    return { success: true, data: result.iconName };
  } catch (error: any) {
    console.error('Error suggesting icon:', error);
    return {
      success: false,
      error: `AI suggestion failed: ${error.message}` || 'An unknown error occurred while suggesting an icon.',
    };
  }
}
