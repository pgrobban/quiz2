import type { Question } from "../../shared/types";

export interface QuestionWithAnswer extends Question {
  correctIndex: number;
}

/**
 * Hardcoded sample question bank for the quiz. Replace/extend this with
 * real content, or load it from a file/CMS - the rest of the app doesn't
 * care where questions come from.
 */
export const QUESTION_BANK: QuestionWithAnswer[] = [
  {
    id: "q1",
    text: "What is the capital of France?",
    options: ["Berlin", "Madrid", "Paris", "Rome"],
    correctIndex: 2,
  },
  {
    id: "q2",
    text: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctIndex: 1,
  },
  {
    id: "q3",
    text: "How many legs does a spider have?",
    options: ["6", "8", "10", "12"],
    correctIndex: 1,
  },
  {
    id: "q4",
    text: "What is the largest ocean on Earth?",
    options: ["Atlantic", "Indian", "Arctic", "Pacific"],
    correctIndex: 3,
  },
  {
    id: "q5",
    text: "Who wrote the play 'Romeo and Juliet'?",
    options: [
      "Charles Dickens",
      "William Shakespeare",
      "Mark Twain",
      "Jane Austen",
    ],
    correctIndex: 1,
  },
];

export function toPublicQuestion(question: QuestionWithAnswer): Question {
  const { id, text, options } = question;
  return { id, text, options };
}
