import type { GameRound, Question, RoundInfo } from "../../shared/types";

export interface QuestionWithAnswer extends Question {
  correctIndex: number;
}

/**
 * Metadata + tutorial content shown to the whole room before a round's
 * questions begin. Swap the tutorial URLs for real screenshots/clips.
 */
export const ROUND_CATALOG: Record<GameRound, RoundInfo> = {
  quiz: {
    id: "quiz",
    title: "Standard Quiz",
    description: "Classic multiple-choice trivia. Fastest correct answers win.",
    tutorial: { type: "image", url: "/tutorials/quiz.png" },
  },
  letters: {
    id: "letters",
    title: "Letters Round",
    description: "Spot the odd one out, or find the hidden word amongst the letters.",
    tutorial: { type: "image", url: "/tutorials/letters.png" },
  },
  matching: {
    id: "matching",
    title: "Matching Round",
    description: "Match pairs of related items as fast as you can.",
    tutorial: { type: "image", url: "/tutorials/matching.png" },
  },
  math: {
    id: "math",
    title: "Math Round",
    description: "Quick mental math - pick the correct result before time runs out.",
    tutorial: { type: "image", url: "/tutorials/math.png" },
  },
  associations: {
    id: "associations",
    title: "Associations Round",
    description: "Guess what connects a set of clues together.",
    tutorial: { type: "image", url: "/tutorials/associations.png" },
  },
};

/**
 * Per-round question banks. Only "quiz" has real content today - the other
 * round types currently reuse the same multiple-choice mechanic as
 * placeholders. Each round's actual gameplay mechanic (letters, matching,
 * math, associations) is TODO and can replace these banks independently
 * without touching the room/round selection flow.
 */
export const QUESTION_BANK: Record<GameRound, QuestionWithAnswer[]> = {
  quiz: [
    {
      id: "quiz-1",
      text: "Dolphins are what type of animals?",
      options: ["Fish", "Reptiles", "Birds", "Mammals"],
      correctIndex: 3,
    },
    {
      id: "quiz-2",
      text: "If the price of something is three times what it was last year, what is the price increase in percent?",
      options: ["100%", "200%", "300%", "400%"],
      correctIndex: 1,
    },
    {
      id: "quiz-3",
      text: "What is the only bird species that can fly backwards?",
      options: ["Hummingbird", "Sparrow", "Eagle", "Penguin"],
      correctIndex: 0,
    },
    {
      id: "quiz-4",
      text: "What is the national arena of Sweden?",
      options: ["Strawberry Arena", "3Arena", "Avicii Arena"],
      correctIndex: 2,
    },
    {
      id: "quiz-5",
      text: "How many different colors are there in the classic bag of Ahlgrens bilar?",
      options: ["2", "3", "4", "5"],
      correctIndex: 1,
    },
    {
      id: "quiz-6",
      text: "Can turtles leave their shells?",
      options: ["Yes", "No"],
      correctIndex: 1,
    },
    {
      id: "quiz-7",
      text: "What is the capital of Switzerland?",
      options: ["Zurich", "Geneva", "Bern", "Basel"],
      correctIndex: 2
    },
    {
      id: "quiz-8",
      text: "Which of the following statements is correct?",
      options: ["An atom consists of molecules", "A molecule consists of atoms"],
      correctIndex: 1,
    },
    {
      id: "quiz-9",
      text: "Do plants have DNA?",
      options: ["Yes", "No"],
      correctIndex: 0,
    },
    {
      id: "quiz-10",
      text: "Which degree burn is the worst?",
      options: ["First", "Third"],
      correctIndex: 1,
    },
    {
      id: "quiz-11",
      text: "Do electric vehicles have exhausts?",
      options: ["Yes", "No"],
      correctIndex: 1,
    },
    {
      id: "quiz-12",
      text: "Is 'lutfisk' a species of fish?",
      options: ["Yes", "No"],
      correctIndex: 1,
    },
    {
      id: "quiz-13",
      text: "(In Sweden), are doctors allowed to prescribe medication for themselves?",
      options: ["Yes", "No"],
      correctIndex: 0,
    },
    {
      id: "quiz-14",
      text: "Are there risk zones for tics (fästingar) on the Swedish west coast?",
      options: ["Yes", "No"],
      correctIndex: 0,
    },
    {
      id: "quiz-15",
      text: "Which of these is a famous square in New York City?",
      options: ["Time Square", "Times Square"],
      correctIndex: 1,
    },
    {
      id: "quiz-16",
      text: "Was the founder of the fashion company Hugo Boss actually called Hugo Boss?",
      options: ["Yes", "No"],
      correctIndex: 0,
    },
    {
      id: "quiz-17",
      text: "What is the natural gas pipeline called?",
      options: ["North Stream", "Nord Stream"],
      correctIndex: 1,
    },
    {
      id: "quiz-18",
      text: "What are corals classified as?",
      options: ["Plants", "Rocks", "Fungi", "Animals"],
      correctIndex: 3,
    },
    {
      id: "quiz-19",
      text: "Did Genghis Khan actually exist?",
      options: ["Yes", "No"],
      correctIndex: 0,
    },
    {
      id: "quiz-20",
      text: "How long is a Vasa race?",
      options: ["70 km", "80 km", "90 km", "100 km"],
      correctIndex: 2,
    },
    {
      id: "quiz-21",
      text: "How many times was Astrid Lindgren married?",
      options: ["0", "1", "2", "3"],
      correctIndex: 1,
    },
    {
      id: "quiz-22",
      text: "What is the correct spelling?",
      options: ["recieve", "receive", "receeve", "receve"],
      correctIndex: 1,
    },
    {
      id: "quiz-23",
      text: "Is the Moominmamma topless?",
      options: ["Yes", "No"],
      correctIndex: 0,
    },
    {
      id: "quiz-24",
      text: "Was Picasso alive during the 1900s?",
      options: ["Yes", "No"],
      correctIndex: 0,
    },
    {
      id: "quiz-25",
      text: "Which of these religions is the oldest?",
      options: ["Christianity", "Islam", "Judaism", "Buddhism"],
      correctIndex: 2,
    },
    {
      id: "quiz-26",
      text: "Which direction does the Facebook 'like' button face?",
      options: ["Left", "Right"],
      correctIndex: 1,
    },
    {
      id: "quiz-27",
      text: "Was M/S Estonia on its way to Stockholm or Tallinn when it sank?",
      options: ["To Stockholm", "To Tallinn"],
      correctIndex: 0,
    },
    {
      id: "quiz-28",
      text: "Do skunks exist in Sweden?",
      options: ["Yes", "No"],
      correctIndex: 1,
    },
    {
      id: "quiz-29",
      text: "Chip and Dale (Piff och Puff) are...",
      options: ["Both male", "Both female", "One male, one female", "Neither male nor female"],
      correctIndex: 0
    },
    {
      id: "quiz-30",
      text: "What year was D-day?",
      options: ["1942", "1943", "1944", "1945"],
      correctIndex: 2,
    }
  ],
  letters: [
    {
      id: "letters-1",
      text: "Which word is spelled correctly?",
      options: ["Recieve", "Receive", "Receeve", "Receve"],
      correctIndex: 1,
    },
    {
      id: "letters-2",
      text: "Which of these is NOT an anagram of 'LISTEN'?",
      options: ["SILENT", "ENLIST", "TINSEL", "SPRINT"],
      correctIndex: 3,
    },
  ],
  matching: [
    {
      id: "matching-1",
      text: "Which capital matches with Japan?",
      options: ["Seoul", "Tokyo", "Beijing", "Bangkok"],
      correctIndex: 1,
    },
    {
      id: "matching-2",
      text: "Which animal matches with 'pride'?",
      options: ["Wolves", "Lions", "Fish", "Crows"],
      correctIndex: 1,
    },
  ],
  math: [
    {
      id: "math-1",
      text: "What is 12 x 8?",
      options: ["86", "96", "106", "108"],
      correctIndex: 1,
    },
    {
      id: "math-2",
      text: "What is the square root of 144?",
      options: ["11", "12", "13", "14"],
      correctIndex: 1,
    },
  ],
  associations: [
    {
      id: "assoc-1",
      text: "Bark, Ring, Leash - these all relate to what?",
      options: ["Cats", "Dogs", "Birds", "Fish"],
      correctIndex: 1,
    },
    {
      id: "assoc-2",
      text: "Crust, Slice, Pepperoni - these all relate to what?",
      options: ["Pizza", "Cake", "Bread", "Burger"],
      correctIndex: 0,
    },
  ],
};

export function toPublicQuestion(question: QuestionWithAnswer): Question {
  const { id, text, options } = question;
  return { id, text, options };
}
