
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { AssessmentQuestion } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type Answer = {
  questionId: string;
  questionText: string;
  isRequired?: boolean;
  answer?: any;
  points?: number; // Allow points to be on the incoming answer for manual grading
};

export const gradeSubmission = (
    answers: Answer[],
    questions: AssessmentQuestion[]
): { score: number; maxScore: number; gradedAnswers: any[] } => {
    
    const maxScore = questions.reduce((total, q) => total + (q.points || 0), 0);

    const gradedAnswers = answers.map(formAnswer => {
        const question = questions.find(q => q.id === formAnswer.questionId);

        if (!question) {
            return { ...formAnswer, isCorrect: null, points: 0 };
        }
        
        const isAutoGradable = question.correctAnswer !== undefined && question.correctAnswer !== null && (Array.isArray(question.correctAnswer) ? question.correctAnswer.length > 0 : question.correctAnswer !== '');
        
        if (!isAutoGradable) {
            // This is a subjective question. Reset points to 0 for manual grading.
            return { ...formAnswer, isCorrect: null, points: 0 };
        }

        // --- Auto-Grading Logic ---
        let isCorrect = false;
        if (question.type === 'multiple-choice') {
            isCorrect = formAnswer.answer === question.correctAnswer;
        } else if (question.type === 'checkbox') {
            const correctAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer.sort() : [question.correctAnswer];
            const studentAnswers = Array.isArray(formAnswer.answer) ? formAnswer.answer.sort() : [];
            isCorrect = correctAnswers.length === studentAnswers.length && correctAnswers.every((ans, i) => ans === studentAnswers[i]);
        }

        const pointsAwarded = isCorrect ? (question.points || 0) : 0;

        return {
            ...formAnswer,
            isCorrect,
            points: pointsAwarded,
        };
    });
    
    const finalScore = gradedAnswers.reduce((total, ans) => total + (ans.points || 0), 0);

    return { score: finalScore, maxScore, gradedAnswers };
};
