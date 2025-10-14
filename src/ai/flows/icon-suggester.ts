
'use server';

/**
 * @fileOverview This flow suggests a Lucide icon name for a given job title.
 *
 * - suggestIcon - A function that suggests an icon.
 * - IconSuggesterInput - The input type for the suggestIcon function.
 * - IconSuggesterOutput - The return type for the suggestIcon function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const IconSuggesterInputSchema = z.object({
  jobTitle: z.string().describe('The job title to find an icon for.'),
});
export type IconSuggesterInput = z.infer<typeof IconSuggesterInputSchema>;

const IconSuggesterOutputSchema = z.object({
  iconName: z.string().describe('The suggested Lucide icon name in camelCase (e.g., "Briefcase", "Code", "PenTool").'),
});
export type IconSuggesterOutput = z.infer<typeof IconSuggesterOutputSchema>;

export async function suggestIcon(
  input: IconSuggesterInput
): Promise<IconSuggesterOutput> {
  return suggestIconFlow(input);
}

const iconSuggesterPrompt = ai.definePrompt({
  name: 'iconSuggesterPrompt',
  input: { schema: IconSuggesterInputSchema },
  output: { schema: IconSuggesterOutputSchema },
  prompt: `You are an expert at selecting the perfect icon for a job title.
Based on the job title provided, suggest a single, relevant icon name from the "lucide-react" icon library.

RULES:
1.  You MUST return the icon name in camelCase format (e.g., "Briefcase", "Code", "PenTool").
2.  Choose an icon that best represents the core function of the job. For example, for "Software Engineer", suggest "Code" or "Terminal". For "Graphic Designer", suggest "PenTool" or "Paintbrush". For a generic business role, "Briefcase" is a good default.
3.  Return ONLY the icon name and nothing else.

Job Title:
'''
{{{jobTitle}}}
'''
`,
});

const suggestIconFlow = ai.defineFlow(
  {
    name: 'suggestIconFlow',
    inputSchema: IconSuggesterInputSchema,
    outputSchema: IconSuggesterOutputSchema,
  },
  async input => {
    const { output } = await iconSuggesterPrompt(input);
    return output!;
  }
);
