
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
    let maxScore = 0;

    const gradedAnswers = answers.map(formAnswer => {
        const question = questions.find(q => q.id === formAnswer.questionId);
        // Ensure question exists and has points assigned for it to be gradable.
        // We check for correctAnswer as well, but points are the main trigger.
        if (!question || (question.points ?? 0) === 0 || !question.correctAnswer) {
            return { ...formAnswer, isCorrect: null, points: 0 };
        }

        const questionPoints = question.points || 0;
        maxScore += questionPoints;

        let isCorrect = false;
        if (question.type === 'multiple-choice') {
            isCorrect = formAnswer.answer === question.correctAnswer;
        } else if (question.type === 'checkbox') {
            const correctAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer.sort() : [question.correctAnswer];
            const studentAnswers = Array.isArray(formAnswer.answer) ? formAnswer.answer.sort() : [];
            isCorrect = correctAnswers.length === studentAnswers.length && correctAnswers.every((ans, i) => ans === studentAnswers[i]);
        }

        if (isCorrect) {
            score += questionPoints;
        }

        return {
            ...formAnswer,
            isCorrect,
            points: isCorrect ? questionPoints : 0,
        };
    });

    return { score, maxScore, gradedAnswers };
};

    