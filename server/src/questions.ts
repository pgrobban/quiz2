import type {
  AssociationsBoard,
  AssociationsBoardBankItem,
  AssociationsColumnLabel,
  GameRound,
  MatchingBoard,
  MatchingBoardBankItem,
  Question,
  RoundInfo,
} from "../../shared/types";

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
    title: "Should I know this?",
    description: "Classic multiple-choice trivia. 1p for each correct answer, +2p for getting every question in the round correct. Answer is automatically locked in.",
    tutorial: { type: "video", url: "/tutorials/quiz.mp4" },
  },
  letters: {
    id: "letters",
    title: "You took the words out of my mouth",
    description:
      "Make the longest word you can from the given letters. Valid words under 8 letters score 1p per letter; 8-11 letters score 8, 10, 12, or 14p; 12 letters score 20p. Don't forget to lock in your answer!",
    tutorial: { type: "video", url: "/tutorials/letters.mp4" },
  },
  matching: {
    id: "matching",
    title: "Will you be my match?",
    description:
      "Match pairs of related items before the timer runs out. 1p for each correct pair, +2 for a perfect board. Answer will be locked in when time runs out.",
    tutorial: { type: "video", url: "/tutorials/matching.mp4" },
  },
  math: {
    id: "math",
    title: "Let me give you my number",
    description:
      "Get as close as you can to the target number using the given numbers and basic arithmetic. 15p for an exact match, 10p if diff ≤ 5, 5p if diff ≤ 10. Don't forget to lock in your answer!",
    tutorial: { type: "video", url: "/tutorials/math.mp4" },
  },
  associations: {
    id: "associations",
    title: "Do we have a connection?",
    description:
      "Final round for the top 2 players: uncover clues on a 4-column wall to solve each column, then the overarching connection. 5 points for each column solved, 10 points for the final connection.",
    tutorial: { type: "video", url: "/tutorials/associations.mp4" },
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
      id: "quiz-0 TUTORIAL",
      text: "TUTORIAL: Which of the following countries is a republic?",
      options: ["Sweden", "Norway", "Denmark", "Finland"],
      correctIndex: 3,
    },
    {
      id: "quiz-1",
      text: "Does Hakuna Matata mean 'no worries' in a real language?",
      options: ["Yes", "No"],
      correctIndex: 0,
    },
    {
      id: "quiz-2",
      text: "How is our company name written on the elevator screens?",
      options: ["Surikat AB", "Surikat Sweden AB"],
      correctIndex: 1,
    },
    {
      id: "quiz-3",
      text: "How many different colors are there in the classic bag of Ahlgrens bilar?",
      options: ["2", "3", "4", "5"],
      correctIndex: 1,
    },
    {
      id: "quiz-4",
      text: "In 'D-day', what does the D stand for?",
      options: ["Decision", "Deploy", "Day"],
      correctIndex: 2,
    },
    {
      id: "quiz-5",
      text: "Does Donald Duck have a dog named Pluto?",
      options: ["Yes", "No"],
      correctIndex: 1,
    },
    {
      id: "quiz-6",
      text: "What is the capital of Switzerland?",
      options: ["Zurich", "Geneva", "Basel", "Bern"],
      correctIndex: 3,
    },
    {
      id: "quiz-7",
      text: "If the price of something is three times what it was last year, what is the price increase in percent?",
      options: ["100%", "200%", "300%", "400%"],
      correctIndex: 1,
    },
    {
      id: "quiz-8",
      text: "Which of the following statements is correct?",
      options: [
        "An atom consists of molecules",
        "A molecule consists of atoms",
      ],
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
      text: "Which degree burn is more dangerous?",
      options: ["First", "Third"],
      correctIndex: 1,
    },
    {
      id: "quiz-11",
      text: "What is the number of the elevator closest to Surikat's reception?",
      options: ["1", "2", "3", "4"],
      correctIndex: 0,
    },
    {
      id: "quiz-12",
      text: "Does the man on the Monopoly box have a monocle?",
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
      text: "Does Donald Duck have visible ears?",
      options: ["Yes", "No"],
      correctIndex: 1,
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
      text: "How many moons does Mars have?",
      options: ["0", "1", "2", "3"],
      correctIndex: 2,
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
      text: "Do battery-electric vehicles have exhausts?",
      options: ["Yes", "No"],
      correctIndex: 1,
    },
    {
      id: "quiz-22",
      text: "What is the correct spelling?",
      options: ["recieve", "receive"],
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
      text: "In Facebook's 'like' icon, does the thumb point left or right?",
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
      text: "Do skunks exist natively in Sweden?",
      options: ["Yes", "No"],
      correctIndex: 1,
    },
    {
      id: "quiz-29",
      text: "Chip and Dale (Piff och Puff) are...",
      options: [
        "Both male",
        "Both female",
        "One male, one female",
        "Neither male nor female",
      ],
      correctIndex: 0,
    },
    {
      id: "quiz-30",
      text: "True or False: 1 million seconds is more than a month.",
      options: ["True", "False"],
      correctIndex: 1,
    },
    {
      id: "quiz-31",
      text: "How many children does Donald Duck have?",
      options: ["0", "1", "2", "3"],
      correctIndex: 0,
    },
    {
      id: "quiz-32",
      text: "What gas do plants absorb for photosynthesis?",
      options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
      correctIndex: 1,
    },
    {
      id: "quiz-33",
      text: "What is the largest desert in the world?",
      options: ["Sahara", "Gobi", "Kalahari", "None of the above"],
      correctIndex: 3,
    },
    {
      id: "quiz-34",
      text: "Did Julius Caesar die before or after year AD 1?",
      options: ["Before", "After"],
      correctIndex: 0,
    },
    {
      id: "quiz-35",
      text: "What is the correct spelling?",
      options: ["Yin and Yan", "Ying and Yang", "Yin and Yang"],
      correctIndex: 2,
    },
    {
      id: "quiz-36",
      text: "Was Bambi a girl or a boy?",
      options: ["Girl", "Boy"],
      correctIndex: 1,
    },
    {
      id: "quiz-37",
      text: "Is there an air traffic control callsign called 'Air Force Two'?",
      options: ["Yes", "No"],
      correctIndex: 0,
    },
    {
      id: "quiz-38",
      text: "Does breast milk contain natural lactose?",
      options: ["Yes", "No"],
      correctIndex: 0,
    },
    {
      id: "quiz-39",
      text: "Do giraffes have something other than ears on top of their heads?",
      options: ["Yes", "No"],
      correctIndex: 0,
    },
    {
      id: "quiz-40",
      text: "Who came first into power?",
      options: ["Stalin", "Lenin"],
      correctIndex: 1,
    },
    {
      id: "quiz-41",
      text: "What of these birds can fly backwards?",
      options: ["Hummingbird", "Sparrow", "Eagle", "Penguin"],
      correctIndex: 0,
    },
    {
      id: "quiz-42",
      text: "What is one half divided by one half?",
      options: ["1/4", "1/2", "1", "2"],
      correctIndex: 2,
    },
    {
      id: "quiz-43",
      text: "Is there a hyphen (dash) in the Coca Cola logo?",
      options: ["Yes", "No"],
      correctIndex: 0,
    },
    {
      id: "quiz-44",
      text: "Which of the following is NOT a Transformers movie?",
      options: ["The Last Knight", "Bumblebee", "Dark of the Moon", "Rise of the Machines"],
      correctIndex: 3,
    },
    {
      id: "quiz-45",
      text: "In the original recording of 'Living next door to Alice', do they sing 'Who the fuck is Alice?'",
      options: ["Yes", "No"],
      correctIndex: 1,
    },
    {
      id: "quiz-46",
      text: "Can you pick up gold with a magnet?",
      options: ["Yes", "No"],
      correctIndex: 1,
    },
    {
      id: "quiz-47",
      text: "Which of these came first?",
      options: ["The Bronze Age", "The Iron Age"],
      correctIndex: 0,
    },
    {
      id: "quiz-48",
      text: "Did the Berlin Wall go around West or East Berlin?",
      options: ["West", "East"],
      correctIndex: 0,
    },
    {
      id: "quiz-49",
      text: "The whale shark is a...",
      options: ["Whale", "Shark", "Mollusk", "Mammal"],
      correctIndex: 1,
    },
    {
      id: "quiz-50",
      text: "Is there mustard on the standard McDonald's cheeseburger?",
      options: ["Yes", "No"],
      correctIndex: 0,
    }
  ],
  letters: [],
  matching: [],
  math: [],
  associations: [],
};

export function toPublicQuestion(question: QuestionWithAnswer): Question {
  const { id, text, options } = question;
  return { id, text, options };
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Bank of "matching" round boards. Each board is a full set of 10 true
 * left/right pairs (no decoys) - e.g. 10 artists and their 10 songs. The
 * columns are independently shuffled when served to clients, so players
 * have to actually know which item goes with which.
 */
export const MATCHING_BANK: MatchingBoardBankItem[] = [
  {
    id: "match-0-T",
    title: "TUTORIAL: Artists & Songs",
    pairs: [
      {
        left: { id: "m0-l1", text: "Queen" },
        right: { id: "m0-r1", text: "Bohemian Rhapsody" },
      },
      {
        left: { id: "m0-l2", text: "ABBA" },
        right: { id: "m0-r2", text: "Dancing Queen" },
      },
      {
        left: { id: "m0-l3", text: "Michael Jackson" },
        right: { id: "m0-r3", text: "Thriller" },
      },
      {
        left: { id: "m0-l4", text: "Nirvana" },
        right: { id: "m0-r4", text: "Smells Like Teen Spirit" },
      },
      {
        left: { id: "m0-l5", text: "Whitney Houston" },
        right: { id: "m0-r5", text: "I Will Always Love You" },
      },
      {
        left: { id: "m0-l6", text: "The Beatles" },
        right: { id: "m0-r6", text: "Hey Jude" },
      },
      {
        left: { id: "m0-l7", text: "Adele" },
        right: { id: "m0-r7", text: "Rolling in the Deep" },
      },
      {
        left: { id: "m0-l8", text: "Elton John" },
        right: { id: "m0-r8", text: "Rocket Man" },
      },
      {
        left: { id: "m0-l9", text: "Survivor" },
        right: { id: "m0-r9", text: "Eye of the Tiger" },
      },
      {
        left: { id: "m0-l10", text: "a-ha" },
        right: { id: "m0-r10", text: "Take On Me" },
      },
    ],
  },
  {
    id: "match-1",
    title: "Gbg tram lines and their colors",
    pairs: [
      {
        left: { id: "m1-l1", text: "Line 1" },
        right: { id: "m1-r1", text: "White" },
      },
      {
        left: { id: "m1-l2", text: "Line 2" },
        right: { id: "m1-r2", text: "Yellow" },
      },
      {
        left: { id: "m1-l3", text: "Line 3" },
        right: { id: "m1-r3", text: "Dark blue" },
      },
      {
        left: { id: "m1-l4", text: "Line 4" },
        right: { id: "m1-r4", text: "Dark green" },
      },
      {
        left: { id: "m1-l5", text: "Line 5" },
        right: { id: "m1-r5", text: "Red" },
      },
      {
        left: { id: "m1-l6", text: "Line 6" },
        right: { id: "m1-r6", text: "Orange" },
      },
      {
        left: { id: "m1-l7", text: "Line 7" },
        right: { id: "m1-r7", text: "Brown" },
      },
      {
        left: { id: "m1-l8", text: "Line 8" },
        right: { id: "m1-r8", text: "Purple" },
      },
      {
        left: { id: "m1-l9", text: "Line 9" },
        right: { id: "m1-r9", text: "Light blue" },
      },
      {
        left: { id: "m1-l10", text: "Line 10" },
        right: { id: "m1-r10", text: "Light green" },
      },
    ],
    keepLeftOrder: true,
  },
  {
    id: "match-2",
    title: "Landmarks and their towns",
    pairs: [
      {
        left: { id: "m2-l1", text: "Fontana di Trevi" },
        right: { id: "m2-r1", text: "Rome" },
      },
      {
        left: { id: "m2-l2", text: "Forbidden City" },
        right: { id: "m2-r2", text: "Beijing" },
      },
      {
        left: { id: "m2-l3", text: "Sky Tree" },
        right: { id: "m2-r3", text: "Tokyo" },
      },
      {
        left: { id: "m2-l4", text: "Golden Gate Bridge" },
        right: { id: "m2-r4", text: "San Francisco" },
      },
      {
        left: { id: "m2-l5", text: "Gardens by the Bay" },
        right: { id: "m2-r5", text: "Singapore" },
      },
      {
        left: { id: "m2-l6", text: "Burj Khalifa" },
        right: { id: "m2-r6", text: "Dubai" },
      },
      {
        left: { id: "m2-l7", text: "Angkor Wat" },
        right: { id: "m2-r7", text: "Siem Reap" },
      },
      {
        left: { id: "m2-l8", text: "Great Pyramid" },
        right: { id: "m2-r8", text: "Giza" },
      },
      {
        left: { id: "m2-l9", text: "Kalemegdan" },
        right: { id: "m2-r9", text: "Belgrade" },
      },
      {
        left: { id: "m2-l10", text: "Brandenburg Gate" },
        right: { id: "m2-r10", text: "Berlin" },
      },
    ],
  },
  {
    id: "match-3",
    title: "Authors & Books",
    pairs: [
      {
        left: { id: "m3-l1", text: "George Orwell" },
        right: { id: "m3-r1", text: "Animal Farm" },
      },
      {
        left: { id: "m3-l2", text: "J.R.R. Tolkien" },
        right: { id: "m3-r2", text: "The Hobbit" },
      },
      {
        left: { id: "m3-l3", text: "Jane Austen" },
        right: { id: "m3-r3", text: "Pride and Prejudice" },
      },
      {
        left: { id: "m3-l4", text: "Mary Shelley" },
        right: { id: "m3-r4", text: "Frankenstein" },
      },
      {
        left: { id: "m3-l5", text: "Herman Melville" },
        right: { id: "m3-r5", text: "Moby-Dick" },
      },
      {
        left: { id: "m3-l6", text: "Harper Lee" },
        right: { id: "m3-r6", text: "To Kill a Mockingbird" },
      },
      {
        left: { id: "m3-l7", text: "Sun Tzu" },
        right: { id: "m3-r7", text: "The Art of War" },
      },
      {
        left: { id: "m3-l8", text: "Agatha Christie" },
        right: { id: "m3-r8", text: "Murder on the Orient Express" },
      },
      {
        left: { id: "m3-l9", text: "Franz Kafka" },
        right: { id: "m3-r9", text: "The Metamorphosis" },
      },
      {
        left: { id: "m3-l10", text: "Homer" },
        right: { id: "m3-r10", text: "The Odyssey" },
      },
    ],
  },
  {
    id: "match-4",
    title: "Actors & Movies",
    pairs: [
      {
        left: { id: "m4-l1", text: "Leonardo DiCaprio" },
        right: { id: "m4-r1", text: "Inception" },
      },
      {
        left: { id: "m4-l2", text: "Robert Downey Jr." },
        right: { id: "m4-r2", text: "Iron Man" },
      },
      {
        left: { id: "m4-l3", text: "Scarlett Johansson" },
        right: { id: "m4-r3", text: "Lost in Translation" },
      },
      {
        left: { id: "m4-l4", text: "Robin Williams" },
        right: { id: "m4-r4", text: "Jumanji" },
      },
      {
        left: { id: "m4-l5", text: "Natalie Portman" },
        right: { id: "m4-r5", text: "Black Swan" },
      },
      {
        left: { id: "m4-l6", text: "Johnny Depp" },
        right: { id: "m4-r6", text: "Pirates of the Caribbean" },
      },
      {
        left: { id: "m4-l7", text: "Morgan Freeman" },
        right: { id: "m4-r7", text: "The Shawshank Redemption" },
      },
      {
        left: { id: "m4-l8", text: "Christian Bale" },
        right: { id: "m4-r8", text: "American Psycho" },
      },
      {
        left: { id: "m4-l9", text: "Margot Robbie" },
        right: { id: "m4-r9", text: "Birds of Prey" },
      },
      {
        left: { id: "m4-l10", text: "Brad Pitt" },
        right: { id: "m4-r10", text: "Fight Club" },
      },
    ],
  },
  {
    id: "match-5",
    title: "Historical royal/political titles and their countries",
    pairs: [
      {
        left: { id: "m5-l1", text: "Shah" },
        right: { id: "m5-r1", text: "Iran" },
      },
      {
        left: { id: "m5-l2", text: "Emperor of the Chrysanthemum Throne" },
        right: { id: "m5-r2", text: "Japan" },
      },
      {
        left: { id: "m5-l3", text: "Doge" },
        right: { id: "m5-r3", text: "Venice" },
      },
      {
        left: { id: "m5-l4", text: "Federal Chancellor" },
        right: { id: "m5-r4", text: "Germany" },
      },
      {
        left: { id: "m5-l5", text: "Tsar" },
        right: { id: "m5-r5", text: "Russia" },
      },
      {
        left: { id: "m5-l6", text: "Sultan" },
        right: { id: "m5-r6", text: "Oman" },
      },
      {
        left: { id: "m5-l7", text: "Pharaoh" },
        right: { id: "m5-r7", text: "Egypt" },
      },
      {
        left: { id: "m5-l8", text: "Grand Duke" },
        right: { id: "m5-r8", text: "Luxembourg" },
      },
      {
        left: { id: "m5-l9", text: "Sovereign Prince" },
        right: { id: "m5-r9", text: "Monaco" },
      },
      {
        left: { id: "m5-l10", text: "Dalai Lama" },
        right: { id: "m5-r10", text: "Tibet" },
      },
    ],
  },
  {
    id: "match-6",
    title: "Operas/musicals and their composers",
    pairs: [
      {
        left: { id: "m6-l1", text: "Carmen" },
        right: { id: "m6-r1", text: "Georges Bizet" },
      },
      {
        left: { id: "m6-l2", text: "The Marriage of Figaro" },
        right: { id: "m6-r2", text: "Mozart" },
      },
      {
        left: { id: "m6-l3", text: "Turandot" },
        right: { id: "m6-r3", text: "Giacomo Puccini" },
      },
      {
        left: { id: "m6-l4", text: "La Traviata" },
        right: { id: "m6-r4", text: "Giuseppe Verdi" },
      },
      {
        left: { id: "m6-l5", text: "Eugene Onegin" },
        right: { id: "m6-r5", text: "Tchaikovsky" },
      },
      {
        left: { id: "m6-l6", text: "The Phantom of the Opera" },
        right: { id: "m6-r6", text: "Andrew Lloyd Webber" },
      },
      {
        left: { id: "m6-l7", text: "Chess" },
        right: { id: "m6-r7", text: "Björn & Benny" },
      },
      {
        left: { id: "m6-l8", text: "The Barber of Seville" },
        right: { id: "m6-r8", text: "Gioachino Rossini" },
      },
      {
        left: { id: "m6-l9", text: "Fidelio" },
        right: { id: "m6-r9", text: "Ludwig van Beethoven" },
      },
      {
        left: { id: "m6-l10", text: "Tristan and Isolde" },
        right: { id: "m6-r10", text: "Richard Wagner" },
      },
    ],
  },
  {
    id: "match-7",
    title: "Cars and their countries of origin",
    pairs: [
      {
        left: { id: "m7-l1", text: "Mitsubishi" },
        right: { id: "m7-r1", text: "Japan" },
      },
      {
        left: { id: "m7-l2", text: "BYD" },
        right: { id: "m7-r2", text: "China" },
      },
      {
        left: { id: "m7-l3", text: "Koenigsegg" },
        right: { id: "m7-r3", text: "Sweden" },
      },
      {
        left: { id: "m7-l4", text: "Aston Martin" },
        right: { id: "m7-r4", text: "United Kingdom" },
      },
      {
        left: { id: "m7-l5", text: "Renault" },
        right: { id: "m7-r5", text: "France" },
      },
      {
        left: { id: "m7-l6", text: "Porsche" },
        right: { id: "m7-r6", text: "Germany" },
      },
      {
        left: { id: "m7-l7", text: "Hyundai" },
        right: { id: "m7-r7", text: "South Korea" },
      },
      {
        left: { id: "m7-l8", text: "Fiat" },
        right: { id: "m7-r8", text: "Italy" },
      },
      {
        left: { id: "m7-l9", text: "Seat" },
        right: { id: "m7-r9", text: "Spain" },
      },
      {
        left: { id: "m7-l10", text: "Skoda" },
        right: { id: "m7-r10", text: "Czech Republic" },
      },
    ],
  },
  {
    id: "match-8",
    title: "Years in history",
    pairs: [
      {
        left: { id: "m8-l1", text: "Start of WW2" },
        right: { id: "m8-r1", text: "1939" },
      },
      {
        left: { id: "m8-l2", text: "Battle of Hastings" },
        right: { id: "m8-r2", text: "1066" },
      },
      {
        left: { id: "m8-l3", text: "Moon landing" },
        right: { id: "m8-r3", text: "1969" },
      },
      {
        left: { id: "m8-l4", text: "Fall of the Berlin Wall" },
        right: { id: "m8-r4", text: "1989" },
      },
      {
        left: { id: "m8-l5", text: "Start of the French Revolution" },
        right: { id: "m8-r5", text: "1789" },
      },
      {
        left: { id: "m8-l6", text: "Start of US civil war" },
        right: { id: "m8-r6", text: "1861" },
      },
      {
        left: { id: "m8-l7", text: "Fall of the Soviet Union" },
        right: { id: "m8-r7", text: "1991" },
      },
      {
        left: { id: "m8-l8", text: "9/11 attacks" },
        right: { id: "m8-r8", text: "2001" },
      },
      {
        left: { id: "m8-l9", text: "Google founded" },
        right: { id: "m8-r9", text: "1998" },
      },
      {
        left: { id: "m8-l10", text: "Last emperor of China reign ended" },
        right: { id: "m8-r10", text: "1912" },
      },
    ],
  },
  {
    id: "match-9",
    title: "Famous scientists and their discoveries",
    pairs: [
      {
        left: { id: "m9-l1", text: "Isaac Newton" },
        right: { id: "m9-r1", text: "Laws of Motion" },
      },
      {
        left: { id: "m9-l2", text: "Albert Einstein" },
        right: { id: "m9-r2", text: "Theory of Relativity" },
      },
      {
        left: { id: "m9-l3", text: "Marie Curie" },
        right: { id: "m9-r3", text: "Radioactivity" },
      },
      {
        left: { id: "m9-l4", text: "Charles Darwin" },
        right: { id: "m9-r4", text: "Theory of Evolution" },
      },
      {
        left: { id: "m9-l5", text: "Galileo Galilei" },
        right: { id: "m9-r5", text: "Heliocentric Theory" },
      },
      {
        left: { id: "m9-l6", text: "Nikola Tesla" },
        right: { id: "m9-r6", text: "Alternating Current" },
      },
      {
        left: { id: "m9-l7", text: "Louis Pasteur" },
        right: { id: "m9-r7", text: "Germ Theory" },
      },
      {
        left: { id: "m9-l8", text: "James Clerk Maxwell" },
        right: { id: "m9-r8", text: "Electromagnetic Theory" },
      },
      {
        left: { id: "m9-l9", text: "Dmitri Mendeleev" },
        right: { id: "m9-r9", text: "Periodic Table" },
      },
      {
        left: { id: "m9-l10", text: "Gregor Mendel" },
        right: { id: "m9-r10", text: "Laws of Inheritance" },
      },
    ],
  },
  {
    id: "match-10",
    title: "Painters and their famous works",
    pairs: [
      {
        left: { id: "m10-l1", text: "Leonardo da Vinci" },
        right: { id: "m10-r1", text: "Mona Lisa" },
      },
      {
        left: { id: "m10-l2", text: "Vincent van Gogh" },
        right: { id: "m10-r2", text: "Starry Night" },
      },
      {
        left: { id: "m10-l3", text: "Pablo Picasso" },
        right: { id: "m10-r3", text: "Guernica" },
      },
      {
        left: { id: "m10-l4", text: "Claude Monet" },
        right: { id: "m10-r4", text: "Water Lilies" },
      },
      {
        left: { id: "m10-l5", text: "Salvador Dalí" },
        right: { id: "m10-r5", text: "The Persistence of Memory" },
      },
      {
        left: { id: "m10-l6", text: "Edvard Munch" },
        right: { id: "m10-r6", text: "The Scream" },
      },
      {
        left: { id: "m10-l7", text: "Johannes Vermeer" },
        right: { id: "m10-r7", text: "Girl with a Pearl Earring" },
      },
      {
        left: { id: "m10-l8", text: "Michelangelo" },
        right: { id: "m10-r8", text: "The Creation of Adam" },
      },
      {
        left: { id: "m10-l9", text: "Rembrandt" },
        right: { id: "m10-r9", text: "The Night Watch" },
      },
      {
        left: { id: "m10-l10", text: "Gustav Klimt" },
        right: { id: "m10-r10", text: "The Kiss" },
      },
    ],
  },
  {
    id: "match-11",
    title: "Games and their protagonists",
    pairs: [
      {
        left: { id: "m11-l1", text: "The Legend of Zelda" },
        right: { id: "m11-r1", text: "Link" },
      },
      {
        left: { id: "m11-l2", text: "The Last of Us" },
        right: { id: "m11-r2", text: "Joel" },
      },
      {
        left: { id: "m11-l3", text: "Halo" },
        right: { id: "m11-r3", text: "Master Chief" },
      },
      {
        left: { id: "m11-l4", text: "Tomb Raider" },
        right: { id: "m11-r4", text: "Lara Croft" },
      },
      {
        left: { id: "m11-l5", text: "Final Fantasy VII" },
        right: { id: "m11-r5", text: "Cloud Strife" },
      },
      {
        left: { id: "m11-l6", text: "Resident Evil" },
        right: { id: "m11-r6", text: "Jill Valentine" },
      },
      {
        left: { id: "m11-l7", text: "Metal Gear Solid" },
        right: { id: "m11-r7", text: "Solid Snake" },
      },
      {
        left: { id: "m11-l8", text: "God of War" },
        right: { id: "m11-r8", text: "Kratos" },
      },
      {
        left: { id: "m11-l9", text: "Assassin's Creed" },
        right: { id: "m11-r9", text: "Ezio Auditore" },
      },
      {
        left: { id: "m11-l10", text: "Overwatch" },
        right: { id: "m11-r10", text: "Tracer" },
      },
    ],
  },
  {
    id: "match-12",
    title: "Words and names ending with -ix",
    pairs: [
      {
        left: { id: "m12-l1", text: "Matrix" },
        right: { id: "m12-r1", text: "2D array" },
      },
      {
        left: { id: "m12-l2", text: "Miraculix" },
        right: { id: "m12-r2", text: "Character in Asterix" },
      },
      {
        left: { id: "m12-l3", text: "Helix" },
        right: { id: "m12-r3", text: "DNA structure" },
      },
      {
        left: { id: "m12-l4", text: "Appendix" },
        right: { id: "m12-r4", text: "Body part" },
      },
      {
        left: { id: "m12-l5", text: "Calyx" },
        right: { id: "m12-r5", text: "Part of a flower" },
      },
      {
        left: { id: "m12-l6", text: "Dominatrix" },
        right: { id: "m12-r6", text: "Person in control" },
      },
      {
        left: { id: "m12-l7", text: "Transfix" },
        right: { id: "m12-r7", text: "Verb" },
      },
      {
        left: { id: "m12-l8", text: "Crucifix" },
        right: { id: "m12-r8", text: "Religious symbol" },
      },
      {
        left: { id: "m12-l9", text: "Suffix" },
        right: { id: "m12-r9", text: "Word ending" },
      },
      {
        left: { id: "m12-l10", text: "Phoenix" },
        right: { id: "m12-r10", text: "Mythical bird" },
      },
    ],
  },
  {
    id: "match-13",
    title: "Song names with women and their artists",
    pairs: [
      {
        left: { id: "m13-l1", text: "Roxanne" },
        right: { id: "m13-r1", text: "The Police" },
      },
      {
        left: { id: "m13-l2", text: "Jolene" },
        right: { id: "m13-r2", text: "Dolly Parton" },
      },
      {
        left: { id: "m13-l3", text: "Billie Jean" },
        right: { id: "m13-r3", text: "Michael Jackson" },
      },
      {
        left: { id: "m13-l4", text: "Eleanor Rigby" },
        right: { id: "m13-r4", text: "The Beatles" },
      },
      {
        left: { id: "m13-l5", text: "Sweet Caroline" },
        right: { id: "m13-r5", text: "Neil Diamond" },
      },
      {
        left: { id: "m13-l6", text: "Angie" },
        right: { id: "m13-r6", text: "The Rolling Stones" },
      },
      {
        left: { id: "m13-l7", text: "Maggie May" },
        right: { id: "m13-r7", text: "Rod Stewart" },
      },
      {
        left: { id: "m13-l8", text: "Layla" },
        right: { id: "m13-r8", text: "Derek and the Dominos" },
      },
      {
        left: { id: "m13-l9", text: "Mandy" },
        right: { id: "m13-r9", text: "Barry Manilow" },
      },
      {
        left: { id: "m13-l10", text: "Rhiannon" },
        right: { id: "m13-r10", text: "Fleetwood Mac" },
      },
    ],
  },
  {
    id: "match-14",
    title: "Currencies in Asia",
    pairs: [
      {
        left: { id: "m14-l1", text: "Japan" },
        right: { id: "m14-r1", text: "Yen" },
      },
      {
        left: { id: "m14-l2", text: "China" },
        right: { id: "m14-r2", text: "Renminbi" },
      },
      {
        left: { id: "m14-l3", text: "Macao" },
        right: { id: "m14-r3", text: "Pataca" },
      },
      {
        left: { id: "m14-l4", text: "South Korea" },
        right: { id: "m14-r4", text: "Won" },
      },
      {
        left: { id: "m14-l5", text: "Thailand" },
        right: { id: "m14-r5", text: "Baht" },
      },
      {
        left: { id: "m14-l6", text: "Malaysia" },
        right: { id: "m14-r6", text: "Ringgit" },
      },
      {
        left: { id: "m14-l7", text: "Taiwan" },
        right: { id: "m14-r7", text: "Dollar" },
      },
      {
        left: { id: "m14-l8", text: "Indonesia" },
        right: { id: "m14-r8", text: "Rupiah" },
      },
      {
        left: { id: "m14-l9", text: "Philippines" },
        right: { id: "m14-r9", text: "Peso" },
      },
      {
        left: { id: "m14-l10", text: "Vietnam" },
        right: { id: "m14-r10", text: "Dong" },
      },
    ],
  },
  {
    id: "match-15",
    title: "Religious terms",
    pairs: [
      {
        left: { id: "m15-l1", text: "Sacrament" },
        right: { id: "m15-r1", text: "Rite, ceremony" },
      },
      {
        left: { id: "m15-l2", text: "Deity" },
        right: { id: "m15-r2", text: "God" },
      },
      {
        left: { id: "m15-l3", text: "Surah" },
        right: { id: "m15-r3", text: "Chapter of the Quran" },
      },
      {
        left: { id: "m15-l4", text: "Dharma" },
        right: { id: "m15-r4", text: "Cosmic law, duty" },
      },
      {
        left: { id: "m15-l5", text: "Fatwa" },
        right: { id: "m15-r5", text: "Legal opinion" },
      },
      {
        left: { id: "m15-l6", text: "Samsara" },
        right: { id: "m15-r6", text: "Cycle of rebirth" },
      },
      {
        left: { id: "m15-l7", text: "Bodhisattva" },
        right: { id: "m15-r7", text: "Enlightened being" },
      },
      {
        left: { id: "m15-l8", text: "Jinja" },
        right: { id: "m15-r8", text: "Shinto shrine" },
      },
      {
        left: { id: "m15-l9", text: "Gospel" },
        right: { id: "m15-r9", text: "Good news" },
      },
      {
        left: { id: "m15-l10", text: "Tabernacle" },
        right: { id: "m15-r10", text: "Portable sanctuary" },
      }
    ],
  },
  {
    id: "match-16",
    title: "Phobias",
    pairs: [
      {
        left: { id: "m16-l1", text: "Arachnophobia" },
        right: { id: "m16-r1", text: "Fear of spiders" },
      },
      {
        left: { id: "m16-l2", text: "Claustrophobia" },
        right: { id: "m16-r2", text: "Fear of confined spaces" },
      },
      {
        left: { id: "m16-l3", text: "Acrophobia" },
        right: { id: "m16-r3", text: "Fear of heights" },
      },
      {
        left: { id: "m16-l4", text: "Nyctophobia" },
        right: { id: "m16-r4", text: "Fear of the dark" },
      },
      {
        left: { id: "m16-l5", text: "Cynophobia" },
        right: { id: "m16-r5", text: "Fear of dogs" },
      },
      {
        left: { id: "m16-l6", text: "Ophidiophobia" },
        right: { id: "m16-r6", text: "Fear of snakes" },
      },
      {
        left: { id: "m16-l7", text: "Aerophobia" },
        right: { id: "m16-r7", text: "Fear of flying" },
      },
      {
        left: { id: "m16-l8", text: "Trypanophobia" },
        right: { id: "m16-r8", text: "Fear of needles" },
      },
      {
        left: { id: "m16-l9", text: "Speleophobia" },
        right: { id: "m16-r9", text: "Fear of caves" },
      },
      {
        left: { id: "m16-l10", text: "Glossophobia" },
        right: { id: "m16-r10", text: "Fear of public speaking" },
      },
    ],
  }
];

/** Builds the public (shuffled, answer-free) board that gets sent to clients. */
export function toPublicMatchingBoard(
  board: MatchingBoardBankItem,
): MatchingBoard {
  return {
    title: board.title,
    previewEndsAt: Date.now() + 3000,
    left: board.keepLeftOrder
      ? board.pairs.map((p) => p.left)
      : shuffle(board.pairs.map((p) => p.left)),
    right: shuffle(board.pairs.map((p) => p.right)),
  };
}

/**
 * Bank of "associations" round boards - the final, host-mediated "wall"
 * round for the top 2 players. Each board has 4 columns (A-D) of 4 clues
 * each, a hidden solution per column, and one overarching final solution.
 */
export const ASSOCIATIONS_BANK: AssociationsBoardBankItem[] = [
  {
    id: "assoc-board-0",
    title: "Tutorial: Panama",
    columns: [
      {
        label: "A",
        clues: ["Cap", "Top", "Cowboy", "Head"],
        solution: "Hat",
      },
      {
        label: "B",
        clues: ["Hungary", "Greece", "Turkey", "China"],
        solution: "Country",
      },
      {
        label: "C",
        clues: ["North", "South", "US", "Washington"],
        solution: "America",
      },
      {
        label: "D",
        clues: ["Land", "Trench", "Irrigation", "Ditch"],
        solution: "Canal",
      },
    ],
    finalSolution: "Panama",
  },
  {
    id: "assoc-board-1",
    title: "Volkswagen",
    columns: [
      {
        label: "A",
        clues: ["Club", "Par", "Putt", "Driver"],
        solution: "Golf",
      },
      {
        label: "B",
        clues: ["Horse", "Game", "Ball", "Stick"],
        solution: "Polo",
      },
      {
        label: "C",
        clues: ["Ladybird", "Wings", "Antennae", "Exoskeleton"],
        solution: "Beetle",
      },
      {
        label: "D",
        clues: ["Berlin Wall", "Schwarzwald", "Wurst", "Beethoven"],
        solution: "Germany",
      },
    ],
    finalSolution: "Volkswagen",
  },
  {
    id: "assoc-board-2",
    title: "Mustache",
    columns: [
      {
        label: "A",
        clues: ["House", "Mouse", "Tiger", "Lion"],
        solution: "Cat",
      },
      {
        label: "B",
        clues: ["Person", "Expression", "Top & front", "Smile"],
        solution: "Face",
      },
      {
        label: "C",
        clues: ["Candle", "Ear", "Sealing", "Polishing"],
        solution: "Wax",
      },
      {
        label: "D",
        clues: ["Gentle", "Boy", "Macho", "Casanova"],
        solution: "Man",
      },
    ],
    finalSolution: "Mustache",
  },
  {
    id: "assoc-board-3",
    title: "Sony",
    columns: [
      {
        label: "A",
        clues: [
          "Gran Turismo",
          "Spyro the Dragon",
          "Uncharted",
          "The Last of Us",
        ],
        solution: "PlayStation",
      },
      {
        label: "B",
        clues: ["Music", "Tape", "Player", "Headphones"],
        solution: "Walkman",
      },
      {
        label: "C",
        clues: ["Sushi", "Tokyo", "Anime", "Manga"],
        solution: "Japan",
      },
      {
        label: "D",
        clues: ["TV", "Camera", "DVD player", "Stereo system"],
        solution: "Electronics",
      },
    ],
    finalSolution: "Sony",
  },
  {
    id: "assoc-board-4",
    title: "Oil",
    columns: [
      {
        label: "A",
        clues: ["Mask", "Heating", "Passing", "Neon"],
        solution: "Gas",
      },
      {
        label: "B",
        clues: ["Electricity", "Rice", "War", "Magnet"],
        solution: "Field",
      },
      {
        label: "C",
        clues: ["Oil", "Plant", "Chemistry", "Textile"],
        solution: "Industry",
      },
      {
        label: "D",
        clues: ["Game genre", "Shoes", "Podium", "Streaming"],
        solution: "Platform",
      },
    ],
    finalSolution: "Oil",
  },
  {
    id: "assoc-board-5",
    title: "Physics",
    columns: [
      {
        label: "A",
        clues: ["Department", "Academics", "Research", "University"],
        solution: "Faculty",
      },
      {
        label: "B",
        clues: ["Mass", "Energy", "Nucleus", "Particle"],
        solution: "Atom",
      },
      {
        label: "C",
        clues: ["Order", "Rule", "Court", "Murphy"],
        solution: "Law",
      },
      {
        label: "D",
        clues: ["Europe & US", "Car", "Edison", "Alternating current"],
        solution: "Tesla",
      },
    ],
    finalSolution: "Physics",
  },
  {
    id: "assoc-board-6",
    title: "Paper",
    columns: [
      {
        label: "A",
        clues: ["Vacuum cleaner", "Gift", "Nylon", "Carrying"],
        solution: "Bag",
      },
      {
        label: "B",
        clues: ["Crown", "Cent", "Time", "Finance"],
        solution: "Money",
      },
      {
        label: "C",
        clues: ["Ink", "Sword", "Brush", "Ball"],
        solution: "Pen",
      },
      {
        label: "D",
        clues: ["Blades", "Garden", "Cut", "Sharpen"],
        solution: "Scissors",
      },
    ],
    finalSolution: "Paper",
  },
  {
    id: "assoc-board-7",
    title: "Fair",
    columns: [
      {
        label: "A",
        clues: ["Surikat AB", "Innovation", "Evolution", "Connectivity"],
        solution: "Technology",
      },
      {
        label: "B",
        clues: ["Cook", "Best-seller", "Self-help", "Dictionary"],
        solution: "Book",
      },
      {
        label: "C",
        clues: ["Race", "Limousine", "Sedan", "SUV"],
        solution: "Car",
      },
      {
        label: "D",
        clues: [
          "Object in time",
          "Software message",
          "Probability outcome",
          "Festival",
        ],
        solution: "Event",
      },
    ],
    finalSolution: "Fair",
  },
  {
    id: "assoc-board-8",
    title: "Sun",
    columns: [
      {
        label: "A",
        clues: ["Grandfather", "Hourglass", "Wrist", "Wall"],
        solution: "Clock",
      },
      {
        label: "B",
        clues: ["Wind", "Drink", "Battery", "Generator"],
        solution: "Energy",
      },
      {
        label: "C",
        clues: ["Eco", "Operating", "Periodic", "Solar"],
        solution: "System",
      },
      {
        label: "D",
        clues: [
          "X",
          "Hope",
          "Laser",
          "Gamma",
        ],
        solution: "Ray",
      },
    ],
    finalSolution: "Sun",
  },
  {
    id: "assoc-board-9",
    title: "Beach",
    columns: [
      {
        label: "A",
        clues: ["Pressure", "Stool", "Drinks", "Music"],
        solution: "Bar",
      },
      {
        label: "B",
        clues: ["Red", "Black", "Dead", "Water"],
        solution: "Sea",
      },
      {
        label: "C",
        clues: ["Guard", "Look", "Clock", "Wrist"],
        solution: "Watch",
      },
      {
        label: "D",
        clues: ["Throwing", "Drying", "Body", "Hanging"],
        solution: "Towel",
      },
    ],
    finalSolution: "Beach",
  },
  {
    id: "assoc-board-10",
    title: "Chain",
    columns: [
      {
        label: "A",
        clues: ["Room", "Pool", "Booking", "Reception"],
        solution: "Hotel",
      },
      {
        label: "B",
        clues: ["Frame", "Pedals", "Light", "Wheels"],
        solution: "Bicycle",
      },
      {
        label: "C",
        clues: ["Menu", "Reservation", "Waiter", "Table"],
        solution: "Restaurant",
      },
      {
        label: "D",
        clues: ["Website", "Connection", "Missing", "Cuff"],
        solution: "Link",
      },
    ],
    finalSolution: "Chain",
  }
];

/** Shown to players/spectators on the live board, regardless of which board is picked - the real theme is the solution, kept secret until solved. */
const ASSOCIATIONS_PUBLIC_TITLE = "Do we have a connection?";

/** Builds the public (answer-free, nothing-opened-yet) board sent to clients. */
export function toPublicAssociationsBoard(
  board: AssociationsBoardBankItem,
): AssociationsBoard {
  return {
    title: ASSOCIATIONS_PUBLIC_TITLE,
    columns: board.columns.map((col) => ({
      label: col.label,
      clues: col.clues.map((_, i) => ({
        field: `${col.label}${i + 1}`,
        text: null,
      })),
      solved: false,
      solution: null,
      solvedBy: null,
    })),
    finalSolved: false,
    finalSolution: null,
    finalSolvedBy: null,
  };
}

/** Finds the real clue text for a given field id (e.g. "B3") from the bank item. */
export function getAssociationsClueText(
  board: AssociationsBoardBankItem,
  field: string,
): string | null {
  const label = field[0] as AssociationsColumnLabel;
  const index = Number(field.slice(1)) - 1;
  const column = board.columns.find((c) => c.label === label);
  if (!column || index < 0 || index >= column.clues.length) return null;
  return column.clues[index];
}
