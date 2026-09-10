import type {
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
      id: "quiz-0 TUTORIAL",
      text: "TUTORIAL: Which of the following countries is a republic?",
      options: ["Sweden", "Norway", "Denmark", "Finland"],
      correctIndex: 3,
    },
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
      text: "In 'D-day', what does the D stand for?",
      options: ["Decision", "Deploy", "Day"],
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
    },
    {
      id: "quiz-31",
      text: "How many children does Donald Duck have?",
      options: ["0", "1", "2", "3"],
      correctIndex: 0,
    },
    {
      id: "quiz-32",
      text: "What gas do plants absorb from the atmosphere?",
      options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
      correctIndex: 1,
    },
    {
      id: "quiz-33",
      text: "In the classic picture of Che Guevara, does he have facial hair?",
      options: ["Yes", "No"],
      correctIndex: 0,
    },
    {
      id: "quiz-34",
      text: "Did Julius Caesar die before or after the year 0?",
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
      text: "Is the callsign of the plane carrying the US Vice President 'Air Force Two'?",
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
      text: "Do giraffes have horns?",
      options: ["Yes", "No"],
      correctIndex: 0
    },
    {
      id: "quiz-40",
      text: "Who came first into power?",
      options: ["Stalin", "Lenin"],
      correctIndex: 1,
    }
  ],
  letters: [],
  matching: [],
  math: [],
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
    id: "match-0",
    title: "TUTORIAL: Artists & Songs",
    pairs: [
      { left: { id: "m0-l1", text: "Queen" }, right: { id: "m0-r1", text: "Bohemian Rhapsody" } },
      { left: { id: "m0-l2", text: "Abba" }, right: { id: "m0-r2", text: "Dancing Queen" } },
      { left: { id: "m0-l3", text: "Michael Jackson" }, right: { id: "m0-r3", text: "Thriller" } },
      { left: { id: "m0-l4", text: "Nirvana" }, right: { id: "m0-r4", text: "Smells Like Teen Spirit" } },
      { left: { id: "m0-l5", text: "Whitney Houston" }, right: { id: "m0-r5", text: "I Will Always Love You" } },
      { left: { id: "m0-l6", text: "The Beatles" }, right: { id: "m0-r6", text: "Hey Jude" } },
      { left: { id: "m0-l7", text: "Adele" }, right: { id: "m0-r7", text: "Rolling in the Deep" } },
      { left: { id: "m0-l8", text: "Elton John" }, right: { id: "m0-r8", text: "Rocket Man" } },
      { left: { id: "m0-l9", text: "Survivor" }, right: { id: "m0-r9", text: "Eye of the Tiger" } },
      { left: { id: "m0-l10", text: "a-ha" }, right: { id: "m0-r10", text: "Take On Me" } },
    ],
  },
  {
    id: "match-1",
    title: "Landmarks and their towns",
    pairs: [
      { left: { id: "m1-l1", text: "Fontana di Trevi" }, right: { id: "m1-r1", text: "Rome" } },
      { left: { id: "m1-l2", text: "Forbidden City" }, right: { id: "m1-r2", text: "Beijing" } },
      { left: { id: "m1-l3", text: "Sky Tree" }, right: { id: "m1-r3", text: "Tokyo" } },
      { left: { id: "m1-l4", text: "Golden Gate Bridge" }, right: { id: "m1-r4", text: "San Francisco" } },
      { left: { id: "m1-l5", text: "Gardens by the Bay" }, right: { id: "m1-r5", text: "Singapore" } },
      { left: { id: "m1-l6", text: "Burj Khalifa" }, right: { id: "m1-r6", text: "Dubai" } },
      { left: { id: "m1-l7", text: "Angkor Wat" }, right: { id: "m1-r7", text: "Siem Reap" } },
      { left: { id: "m1-l8", text: "Great Pyramid" }, right: { id: "m1-r8", text: "Giza" } },
      { left: { id: "m1-l9", text: "Kalemegdan" }, right: { id: "m1-r9", text: "Belgrade" } },
      { left: { id: "m1-l10", text: "Brandenburg Gate" }, right: { id: "m1-r10", text: "Berlin" } },
    ],
  },
  {
    id: "match-2",
    title: "Authors & Books",
    pairs: [
      { left: { id: "m2-l1", text: "George Orwell" }, right: { id: "m2-r1", text: "Animal Farm" } },
      { left: { id: "m2-l2", text: "J.R.R. Tolkien" }, right: { id: "m2-r2", text: "The Hobbit" } },
      { left: { id: "m2-l3", text: "Jane Austen" }, right: { id: "m2-r3", text: "Pride and Prejudice" } },
      { left: { id: "m2-l4", text: "Mary Shelley" }, right: { id: "m2-r4", text: "Frankenstein" } },
      { left: { id: "m2-l5", text: "Herman Melville" }, right: { id: "m2-r5", text: "Moby-Dick" } },
      { left: { id: "m2-l6", text: "Harper Lee" }, right: { id: "m2-r6", text: "To Kill a Mockingbird" } },
      { left: { id: "m2-l7", text: "The Art of War" }, right: { id: "m2-r7", text: "Sun Tzu" } },
      { left: { id: "m2-l8", text: "Agatha Christie" }, right: { id: "m2-r8", text: "Murder on the Orient Express" } },
      { left: { id: "m2-l9", text: "Franz Kafka" }, right: { id: "m2-r9", text: "The Metamorphosis" } },
      { left: { id: "m2-l10", text: "Homer" }, right: { id: "m2-r10", text: "The Odyssey" } },
    ],
  },
  {
    id: "match-3",
    title: "Actors & Movies",
    pairs: [
      { left: { id: "m3-l1", text: "Leonardo DiCaprio" }, right: { id: "m3-r1", text: "Inception" } },
      { left: { id: "m3-l2", text: "Robert Downey Jr." }, right: { id: "m3-r2", text: "Iron Man" } },
      { left: { id: "m3-l3", text: "Scarlett Johansson" }, right: { id: "m3-r3", text: "Lost in Translation" } },
      { left: { id: "m3-l4", text: "Robin Williams" }, right: { id: "m3-r4", text: "Jumanji" } },
      { left: { id: "m3-l5", text: "Natalie Portman" }, right: { id: "m3-r5", text: "Black Swan" } },
      { left: { id: "m3-l6", text: "Johnny Depp" }, right: { id: "m3-r6", text: "Pirates of the Caribbean" } },
      { left: { id: "m3-l7", text: "Morgan Freeman" }, right: { id: "m3-r7", text: "The Shawshank Redemption" } },
      { left: { id: "m3-l8", text: "Christian Bale" }, right: { id: "m3-r8", text: "American Psycho" } },
      { left: { id: "m3-l9", text: "Margot Robbie" }, right: { id: "m3-r9", text: "The Wolf of Wall Street" } },
      { left: { id: "m3-l10", text: "Brad Pitt" }, right: { id: "m3-r10", text: "Fight Club" } },
    ]
  },
  {
    id: "match-4",
    title: "Soccer teams and their countries",
    pairs: [
      { left: { id: "m4-l1", text: "Fortuna Cettard" }, right: { id: "m4-r1", text: "Holland" } },
      { left: { id: "m4-l2", text: "Kaizer Chiefs" }, right: { id: "m4-r2", text: "South Africa" } },
      { left: { id: "m4-l3", text: "Velez Sarsfield" }, right: { id: "m4-r3", text: "Argentina" } },
      { left: { id: "m4-l4", text: "Kashima Antlers" }, right: { id: "m4-r4", text: "Japan" } },
      { left: { id: "m4-l5", text: "Columbus Crew" }, right: { id: "m4-r5", text: "USA" } },
      { left: { id: "m4-l6", text: "Crewe Alexandra" }, right: { id: "m4-r6", text: "England" } },
      { left: { id: "m4-l7", text: "Atletico Mineiro" }, right: { id: "m4-r7", text: "Brazil" } },
      { left: { id: "m4-l8", text: "Club Always Ready" }, right: { id: "m4-r8", text: "Bolivia" } },
      { left: { id: "m4-l9", text: "Rayo Vallecano" }, right: { id: "m4-r9", text: "Spain" } },
      { left: { id: "m4-l10", text: "Admira Wacker" }, right: { id: "m4-r10", text: "Austria" } },
    ]
  },
  {
    id: "match-5",
    title: "Cars and their countries of origin",
    pairs: [
      { left: { id: "m5-l1", text: "Mitsubishi" }, right: { id: "m5-r1", text: "Japan" } },
      { left: { id: "m5-l2", text: "BYD" }, right: { id: "m5-r2", text: "China" } },
      { left: { id: "m5-l3", text: "Koenigsegg" }, right: { id: "m5-r3", text: "Sweden" } },
      { left: { id: "m5-l4", text: "Ferrari" }, right: { id: "m5-r4", text: "Italy" } },
      { left: { id: "m5-l5", text: "Renault" }, right: { id: "m5-r5", text: "France" } },
      { left: { id: "m5-l6", text: "Porsche" }, right: { id: "m5-r6", text: "Germany" } },
      { left: { id: "m5-l7", text: "Hyundai" }, right: { id: "m5-r7", text: "South Korea" } },
      { left: { id: "m5-l8", text: "Fiat" }, right: { id: "m5-r8", text: "Italy" } },
      { left: { id: "m5-l9", text: "Peugeot" }, right: { id: "m5-r9", text: "France" } },
      { left: { id: "m5-l10", text: "Jaguar" }, right: { id: "m5-r10", text: "United Kingdom" } },
    ]
  },
  {
    id: "match-6",
    title: "Operas and their composers",
    pairs: [
      { left: { id: "m6-l1", text: "Carmen" }, right: { id: "m6-r1", text: "Georges Bizet" } },
      { left: { id: "m6-l2", text: "The Marriage of Figaro" }, right: { id: "m6-r2", text: "Mozart" } },
      { left: { id: "m6-l3", text: "Tosca" }, right: { id: "m6-r3", text: "Giacomo Puccini" } },
      { left: { id: "m6-l4", text: "Rigoletto" }, right: { id: "m6-r4", text: "Giuseppe Verdi" } },
      { left: { id: "m6-l5", text: "Eugene Onegin" }, right: { id: "m6-r5", text: "Tchaikovsky" } },
      { left: { id: "m6-l6", text: "The Phantom of the Opera" }, right: { id: "m6-r6", text: "Andrew Lloyd Webber" } },
      { left: { id: "m6-l7", text: "Chess" }, right: { id: "m6-r7", text: "Björn & Benny" } },
      { left: { id: "m6-l8", text: "The Barber of Seville" }, right: { id: "m6-r8", text: "Gioachino Rossini" } },
      { left: { id: "m6-l9", text: "Turandot" }, right: { id: "m6-r9", text: "Giacomo Puccini" } },
      { left: { id: "m6-l10", text: "Tristan and Isolde" }, right: { id: "m6-r10", text: "Richard Wagner" } },
    ]
  },
  {
    id: "match-7",
    title: "Countries and their capitals",
    pairs: [
      { left: { id: "m7-l1", text: "Australia" }, right: { id: "m7-r1", text: "Canberra" } },
      { left: { id: "m7-l2", text: "Cambodia" }, right: { id: "m7-r2", text: "Phnom Penh" } },
      { left: { id: "m7-l3", text: "Turkey" }, right: { id: "m7-r3", text: "Ankara" } },
      { left: { id: "m7-l4", text: "Niger" }, right: { id: "m7-r4", text: "Niamey" } },
      { left: { id: "m7-l5", text: "Paraguay" }, right: { id: "m7-r5", text: "Asunción" } },
      { left: { id: "m7-l6", text: "Nicaragua" }, right: { id: "m7-r6", text: "Managua" } },
      { left: { id: "m7-l7", text: "Haiti" }, right: { id: "m7-r7", text: "Port-au-Prince" } },
      { left: { id: "m7-l8", text: "Trinidad and Tobago" }, right: { id: "m7-r8", text: "Port of Spain" } },
      { left: { id: "m7-l9", text: "Chad" }, right: { id: "m7-r9", text: "N'Djamena" } },
      { left: { id: "m7-l10", text: "Bhutan" }, right: { id: "m7-r10", text: "Thimphu" } },
    ]
  },
  {
    id: "match-8",
    title: "Famous scientists and their discoveries",
    pairs: [
      { left: { id: "m8-l1", text: "Isaac Newton" }, right: { id: "m8-r1", text: "Laws of Motion" } },
      { left: { id: "m8-l2", text: "Albert Einstein" }, right: { id: "m8-r2", text: "Theory of Relativity" } },
      { left: { id: "m8-l3", text: "Marie Curie" }, right: { id: "m8-r3", text: "Radioactivity" } },
      { left: { id: "m8-l4", text: "Charles Darwin" }, right: { id: "m8-r4", text: "Theory of Evolution" } },
      { left: { id: "m8-l5", text: "Galileo Galilei" }, right: { id: "m8-r5", text: "Heliocentric Theory" } },
      { left: { id: "m8-l6", text: "Nikola Tesla" }, right: { id: "m8-r6", text: "Alternating Current" } },
      { left: { id: "m8-l7", text: "Louis Pasteur" }, right: { id: "m8-r7", text: "Germ Theory" } },
      { left: { id: "m8-l8", text: "James Clerk Maxwell" }, right: { id: "m8-r8", text: "Electromagnetic Theory" } },
      { left: { id: "m8-l9", text: "Dmitri Mendeleev" }, right: { id: "m8-r9", text: "Periodic Table" } },
      { left: { id: "m8-l10", text: "Gregor Mendel" }, right: { id: "m8-r10", text: "Laws of Inheritance" } },
    ]
  },
  {
    id: "match-9",
    title: "Painters and their famous works",
    pairs: [
      { left: { id: "m9-l1", text: "Leonardo da Vinci" }, right: { id: "m9-r1", text: "Mona Lisa" } },
      { left: { id: "m9-l2", text: "Vincent van Gogh" }, right: { id: "m9-r2", text: "Starry Night" } },
      { left: { id: "m9-l3", text: "Pablo Picasso" }, right: { id: "m9-r3", text: "Guernica" } },
      { left: { id: "m9-l4", text: "Claude Monet" }, right: { id: "m9-r4", text: "Water Lilies" } },
      { left: { id: "m9-l5", text: "Salvador Dalí" }, right: { id: "m9-r5", text: "The Persistence of Memory" } },
      { left: { id: "m9-l6", text: "Edvard Munch" }, right: { id: "m9-r6", text: "The Scream" } },
      { left: { id: "m9-l7", text: "Johannes Vermeer" }, right: { id: "m9-r7", text: "Girl with a Pearl Earring" } },
      { left: { id: "m9-l8", text: "Michelangelo" }, right: { id: "m9-r8", text: "The Creation of Adam" } },
      { left: { id: "m9-l9", text: "Rembrandt" }, right: { id: "m9-r9", text: "The Night Watch" } },
      { left: { id: "m9-l10", text: "Gustav Klimt" }, right: { id: "m9-r10", text: "The Kiss" } },
    ]
  },
  {
    id: 'match-10',
    title: "Games and their protagonists",
    pairs: [
      { left: { id: "m10-l1", text: "The Legend of Zelda" }, right: { id: "m10-r1", text: "Link" } },
      { left: { id: "m10-l2", text: "The Last of Us" }, right: { id: "m10-r2", text: "Joel" } },
      { left: { id: "m10-l3", text: "Halo" }, right: { id: "m10-r3", text: "Master Chief" } },
      { left: { id: "m10-l4", text: "Tomb Raider" }, right: { id: "m10-r4", text: "Lara Croft" } },
      { left: { id: "m10-l5", text: "Final Fantasy VII" }, right: { id: "m10-r5", text: "Cloud Strife" } },
      { left: { id: "m10-l6", text: "Resident Evil" }, right: { id: "m10-r6", text: "Jill Valentine" } },
      { left: { id: "m10-l7", text: "Metal Gear Solid" }, right: { id: "m10-r7", text: "Solid Snake" } },
      { left: { id: "m10-l8", text: "God of War" }, right: { id: "m10-r8", text: "Kratos" } },
      { left: { id: "m10-l9", text: "Assassin's Creed" }, right: { id: "m10-r9", text: "Ezio Auditore" } },
      { left: { id: "m10-l10", text: "Overwatch" }, right: { id: "m10-r10", text: "Tracer" } },
    ]
  },
  {
    id: 'match-11',
    title: "Words and names ending with -ix",
    pairs: [
      { left: { id: "m11-l1", text: "Matrix" }, right: { id: "m11-r1", text: "Movie" } },
      { left: { id: "m11-l2", text: "Miraculix" }, right: { id: "m11-r2", text: "Character in Asterix" } },
      { left: { id: "m11-l3", text: "Helix" }, right: { id: "m11-r3", text: "DNA structure" } },
      { left: { id: "m11-l4", text: "Appendix" }, right: { id: "m11-r4", text: "Body part" } },
      { left: { id: "m11-l5", text: "Calyx" }, right: { id: "m11-r5", text: "Part of a flower" } },
      { left: { id: "m11-l6", text: "Dominatrix" }, right: { id: "m11-r6", text: "Person in control" } },
      { left: { id: "m11-l7", text: "Transfix" }, right: { id: "m11-r7", text: "Verb" } },
      { left: { id: "m11-l8", text: "Crucifix" }, right: { id: "m11-r8", text: "Religious symbol" } },
      { left: { id: "m11-l9", text: "Suffix" }, right: { id: "m11-r9", text: "Word ending" } },
      { left: { id: "m11-l10", text: "Phoenix Wright" }, right: { id: "m11-r10", text: "Video game character" } },
    ]
  },
  {
    id: 'match-12',
    title: "Song names with women and their artists",
    pairs: [
      { left: { id: "m12-l1", text: "Roxanne" }, right: { id: "m12-r1", text: "The Police" } },
      { left: { id: "m12-l2", text: "Jolene" }, right: { id: "m12-r2", text: "Dolly Parton" } },
      { left: { id: "m12-l3", text: "Billie Jean" }, right: { id: "m12-r3", text: "Michael Jackson" } },
      { left: { id: "m12-l4", text: "Lucy in the Sky with Diamonds" }, right: { id: "m12-r4", text: "The Beatles" } },
      { left: { id: "m12-l5", text: "Sweet Caroline" }, right: { id: "m12-r5", text: "Neil Diamond" } },
      { left: { id: "m12-l6", text: "Angie" }, right: { id: "m12-r6", text: "The Rolling Stones" } },
      { left: { id: "m12-l7", text: "Eleanor Rigby" }, right: { id: "m12-r7", text: "The Beatles" } },
      { left: { id: "m12-l8", text: "Layla" }, right: { id: "m12-r8", text: "Derek and the Dominos" } },
      { left: { id: "m12-l9", text: "Mandy" }, right: { id: "m12-r9", text: "Barry Manilow" } },
      { left: { id: "m12-l10", text: "Rhiannon" }, right: { id: "m12-r10", text: "Fleetwood Mac" } },
    ]
  }
];

/** Builds the public (shuffled, answer-free) board that gets sent to clients. */
export function toPublicMatchingBoard(board: MatchingBoardBankItem): MatchingBoard {
  return {
    left: shuffle(board.pairs.map((p) => p.left)),
    right: shuffle(board.pairs.map((p) => p.right)),
  };
}
