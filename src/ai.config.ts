import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  // Set your default model here
  model: 'googleai/gemini-1.5-flash-latest', 
});