
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
};

export const gradeSubmission = (
    answers: Answer[],
    questions: AssessmentQuestion[]
): { score: number; maxScore: number; gradedAnswers: any[] } => {
    let score = 0;
    
    // Correctly calculate maxScore by summing points from ALL questions that have points assigned.
    const maxScore = questions.reduce((total, q) => total + (q.points || 0), 0);

    const gradedAnswers = answers.map(formAnswer => {
        const question = questions.find(q => q.id === formAnswer.questionId);

        // If a question doesn't exist or has no points, it's not gradable.
        if (!question || (question.points ?? 0) === 0) {
            return { ...formAnswer, isCorrect: null, points: 0 };
        }
        
        // This question is gradable, but is it auto-gradable?
        const isAutoGradable = !!question.correctAnswer;
        
        if (!isAutoGradable) {
            // For manually graded questions, return as-is for now. HR will fill in points later.
            // isCorrect remains null until manually graded.
            return { ...formAnswer, isCorrect: null, points: formAnswer.points || 0 };
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
        if (isCorrect) {
            score += pointsAwarded;
        }

        return {
            ...formAnswer,
            isCorrect,
            points: pointsAwarded,
        };
    });
    
    // For submissions that have already been manually graded, we need to ensure the total score is correct.
    const finalScore = gradedAnswers.reduce((total, ans) => total + (ans.points || 0), 0);

    return { score: finalScore, maxScore, gradedAnswers };
};

    