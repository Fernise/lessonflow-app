import type { CefrLevel } from "./types";

export type LessonRecord = {
  date: string;
  title: string;
  focus: string;
  topicsCovered: string[];
  homeworkAssigned: string;
  notes: string;
  teacherFeedback: string;
};

export type AiSuggestions = {
  suggestedNextLessonTopic: string;
  vocabularyToRecycle: string[];
  suggestedSpeakingActivity: string;
  suggestedHomework: string;
};

export type Student = {
  id: string;
  name: string;
  level: CefrLevel;
  nativeLanguage: string;
  goals: string[];
  interests: string[];
  preferredTopics: string[];
  lessonFrequency: string;
  lastLesson: string;
  nextSuggestedFocus: string;
  notes: string;
  recurringMistakes: string[];
  grammarWeaknesses: string[];
  vocabularyToReview: string[];
  pronunciationNotes: string[];
  speakingConfidence: "Low" | "Developing" | "Confident" | "Advanced";
  listeningWeaknesses: string[];
  lessonHistory: LessonRecord[];
  aiSuggestions: AiSuggestions;
  generatedMaterialIds: string[];
};

export type Material = {
  id: string;
  title: string;
  studentId: string;
  studentName: string;
  level: CefrLevel;
  skill: string;
  topic: string;
  exerciseType: string;
  createdAt: string;
  summary: string;
};

export const students: Student[] = [
  {
    id: "maria-gomez",
    name: "Maria Gomez",
    level: "B1",
    nativeLanguage: "Spanish",
    goals: ["Speak more confidently in client meetings", "Use past tenses accurately"],
    interests: ["travel", "work culture", "food", "city life"],
    preferredTopics: ["travel", "work culture", "food", "city life"],
    lessonFrequency: "2 lessons / week",
    lastLesson: "May 19, 2026",
    nextSuggestedFocus: "Past simple vs. present perfect in work updates",
    notes: "Enjoys role-play and practical meeting language. Needs time to prepare before open discussion.",
    recurringMistakes: ["Forgets third-person -s", "Overuses present simple for past events", "Drops articles before jobs"],
    grammarWeaknesses: ["Present perfect", "Question formation in follow-ups", "Articles with professions"],
    vocabularyToReview: ["deadline", "briefing", "delayed", "arrange", "recommend", "reschedule"],
    pronunciationNotes: ["Final consonants in past tense endings", "Stress in recommend and colleague"],
    speakingConfidence: "Developing",
    listeningWeaknesses: ["Fast connected speech in meetings", "Reduced forms such as gonna and wanna"],
    lessonHistory: [
      {
        date: "May 19, 2026",
        title: "Project updates",
        focus: "Past tenses and meeting phrases",
        topicsCovered: ["status updates", "project delays", "meeting summaries"],
        homeworkAssigned: "Write a five-sentence update about a delayed project using three target phrases.",
        notes: "Maria self-corrected several past tense errors after prompting.",
        teacherFeedback: "Good range of work vocabulary; keep drilling present perfect for recent results."
      },
      {
        date: "May 12, 2026",
        title: "Travel problems",
        focus: "Explaining issues and asking for help",
        topicsCovered: ["airport delays", "hotel complaints", "polite requests"],
        homeworkAssigned: "Record a one-minute complaint and send it before the next lesson.",
        notes: "Strong engagement with role-play. Needed sentence frames for longer turns.",
        teacherFeedback: "Improve fluency by grouping ideas before speaking."
      },
      {
        date: "May 5, 2026",
        title: "Restaurant opinions",
        focus: "Comparatives and recommendations",
        topicsCovered: ["restaurant reviews", "food adjectives", "recommendations"],
        homeworkAssigned: "Write a short restaurant recommendation with two comparisons.",
        notes: "Vocabulary recall was strong, but article use was inconsistent.",
        teacherFeedback: "Great confidence in familiar topics; move toward workplace topics next."
      }
    ],
    aiSuggestions: {
      suggestedNextLessonTopic: "Client meeting update: explaining what has changed and why",
      vocabularyToRecycle: ["deadline", "delayed", "reschedule", "recommend"],
      suggestedSpeakingActivity: "Two-round client call role-play: first explain a delay, then negotiate a new deadline.",
      suggestedHomework: "Write a short meeting recap using present perfect for recent changes and past simple for finished actions."
    },
    generatedMaterialIds: ["mat-1", "mat-4"]
  },
  {
    id: "kenji-sato",
    name: "Kenji Sato",
    level: "B2",
    nativeLanguage: "Japanese",
    goals: ["Lead technical demos", "Sound more natural in Q&A"],
    interests: ["technology", "product design", "startups", "productivity"],
    preferredTopics: ["technology", "product design", "startups", "productivity"],
    lessonFrequency: "1 lesson / week",
    lastLesson: "May 20, 2026",
    nextSuggestedFocus: "Handling interruptions during a demo",
    notes: "Strong vocabulary but answers can be too brief. Benefits from timed speaking tasks.",
    recurringMistakes: ["Uses very formal connectors in casual speech", "Avoids follow-up questions"],
    grammarWeaknesses: ["Conditionals for product scenarios", "Natural use of phrasal verbs", "Articles with technical nouns"],
    vocabularyToReview: ["walkthrough", "trade-off", "edge case", "adoption", "constraint", "rollout"],
    pronunciationNotes: ["Sentence stress in contrastive explanations", "Linking in phrasal verbs"],
    speakingConfidence: "Confident",
    listeningWeaknesses: ["Interruptions during Q&A", "Colloquial product feedback"],
    lessonHistory: [
      {
        date: "May 20, 2026",
        title: "Product demo Q&A",
        focus: "Clarifying and expanding answers",
        topicsCovered: ["feature walkthrough", "customer objections", "follow-up questions"],
        homeworkAssigned: "Prepare three longer answers to common demo questions.",
        notes: "Answered accurately but sometimes stopped after one sentence.",
        teacherFeedback: "Push for more examples and invite the listener back into the conversation."
      },
      {
        date: "May 13, 2026",
        title: "Startup pitch",
        focus: "Persuasive language",
        topicsCovered: ["pitch structure", "market problem", "solution benefits"],
        homeworkAssigned: "Record a 90-second product pitch with one customer story.",
        notes: "Good structure. Needed more natural transitions.",
        teacherFeedback: "Replace formal linkers with simpler signposting."
      },
      {
        date: "May 6, 2026",
        title: "Design critique",
        focus: "Diplomatic disagreement",
        topicsCovered: ["design feedback", "trade-offs", "softening disagreement"],
        homeworkAssigned: "Write five diplomatic disagreement phrases and one example for each.",
        notes: "Comfortable with technical detail, less comfortable with disagreement.",
        teacherFeedback: "Strong precision; continue building conversational flexibility."
      }
    ],
    aiSuggestions: {
      suggestedNextLessonTopic: "Demo interruptions: keeping control while answering naturally",
      vocabularyToRecycle: ["walkthrough", "trade-off", "edge case", "rollout"],
      suggestedSpeakingActivity: "Live demo simulation with teacher interruptions every 45 seconds.",
      suggestedHomework: "Rewrite five short Q&A answers into fuller answers with examples and follow-up questions."
    },
    generatedMaterialIds: ["mat-2"]
  },
  {
    id: "ana-kowalski",
    name: "Ana Kowalski",
    level: "C1",
    nativeLanguage: "Polish",
    goals: ["Prepare for academic interviews", "Improve nuance in argumentation"],
    interests: ["education", "psychology", "research", "public policy"],
    preferredTopics: ["education", "psychology", "research", "public policy"],
    lessonFrequency: "2 lessons / month",
    lastLesson: "May 18, 2026",
    nextSuggestedFocus: "Hedging claims and challenging assumptions",
    notes: "Likes rich texts and debate. Wants precise correction after speaking tasks.",
    recurringMistakes: ["Occasional article errors with abstract nouns", "Repeats a narrow set of discourse markers"],
    grammarWeaknesses: ["Articles with abstract concepts", "Subtle modal verbs for claims", "Cleft sentences for emphasis"],
    vocabularyToReview: ["caveat", "underpin", "tentative", "robust", "bias", "scope"],
    pronunciationNotes: ["Intonation in challenging questions", "Word stress in methodology and controversy"],
    speakingConfidence: "Advanced",
    listeningWeaknesses: ["Dense academic turns", "Speakers who hedge indirectly"],
    lessonHistory: [
      {
        date: "May 18, 2026",
        title: "Research interview practice",
        focus: "Hedging and evidence",
        topicsCovered: ["research methods", "evidence quality", "interview responses"],
        homeworkAssigned: "Draft answers to three interview questions using hedging language.",
        notes: "Excellent analytical content. Needs more variety in discourse markers.",
        teacherFeedback: "Use caveats earlier to make claims sound more precise."
      },
      {
        date: "May 11, 2026",
        title: "Learning science debate",
        focus: "Counterarguments",
        topicsCovered: ["retrieval practice", "motivation", "classroom evidence"],
        homeworkAssigned: "Write a balanced paragraph with one concession and one counterclaim.",
        notes: "Strong reasoning, occasionally too direct when challenging claims.",
        teacherFeedback: "Great depth; soften disagreement with exploratory language."
      },
      {
        date: "May 4, 2026",
        title: "Conference networking",
        focus: "Natural follow-up questions",
        topicsCovered: ["research interests", "networking", "professional small talk"],
        homeworkAssigned: "Prepare eight follow-up questions for a conference conversation.",
        notes: "Follow-up questions became more natural by the end of the lesson.",
        teacherFeedback: "Excellent control of register; maintain warmer intonation."
      }
    ],
    aiSuggestions: {
      suggestedNextLessonTopic: "Interview answers that balance confidence with academic caution",
      vocabularyToRecycle: ["caveat", "tentative", "robust", "scope"],
      suggestedSpeakingActivity: "Mock interview with follow-up challenges that require hedged responses.",
      suggestedHomework: "Record a three-minute answer about research limitations using four recycled vocabulary items."
    },
    generatedMaterialIds: ["mat-3"]
  },
  {
    id: "lucas-martin",
    name: "Lucas Martin",
    level: "A2",
    nativeLanguage: "French",
    goals: ["Handle basic travel conversations", "Build everyday vocabulary"],
    interests: ["sports", "family", "cities", "music"],
    preferredTopics: ["sports", "family", "cities", "music"],
    lessonFrequency: "1 lesson / week",
    lastLesson: "May 16, 2026",
    nextSuggestedFocus: "Asking for directions and checking understanding",
    notes: "Needs short, visual tasks and clear examples. Responds well to repetition and games.",
    recurringMistakes: ["Confuses there is and there are", "Uses infinitive after can", "Word order in questions"],
    grammarWeaknesses: ["Question order", "Can + base verb", "There is / there are"],
    vocabularyToReview: ["opposite", "near", "ticket", "platform", "turn left", "straight ahead"],
    pronunciationNotes: ["H sound at the start of words", "Short i in ticket"],
    speakingConfidence: "Low",
    listeningWeaknesses: ["Numbers and times", "Directions with multiple steps"],
    lessonHistory: [
      {
        date: "May 16, 2026",
        title: "At the train station",
        focus: "Buying tickets",
        topicsCovered: ["transport", "prices", "times"],
        homeworkAssigned: "Practice a ticket dialogue twice and write five transport words.",
        notes: "Needed repetition with numbers but remembered platform vocabulary.",
        teacherFeedback: "Keep instructions short and add visual support."
      },
      {
        date: "May 9, 2026",
        title: "My neighborhood",
        focus: "There is / there are",
        topicsCovered: ["places in town", "directions", "neighborhood description"],
        homeworkAssigned: "Describe your street using there is and there are.",
        notes: "Good topic motivation when talking about familiar places.",
        teacherFeedback: "Drill question order before open speaking."
      },
      {
        date: "May 2, 2026",
        title: "Weekend plans",
        focus: "Can and would like",
        topicsCovered: ["sports", "free time", "simple invitations"],
        homeworkAssigned: "Write four sentences about weekend plans with can.",
        notes: "Enjoyed sports examples and repeated model sentences well.",
        teacherFeedback: "Build confidence with short successful speaking turns."
      }
    ],
    aiSuggestions: {
      suggestedNextLessonTopic: "Getting around a new city with simple direction language",
      vocabularyToRecycle: ["opposite", "near", "platform", "turn left"],
      suggestedSpeakingActivity: "Map-based information gap: ask for directions and repeat the route back.",
      suggestedHomework: "Label a simple city map and write six direction sentences."
    },
    generatedMaterialIds: ["mat-5"]
  }
];

export const materials: Material[] = [
  {
    id: "mat-1",
    title: "Client meeting role-play pack",
    studentId: "maria-gomez",
    studentName: "Maria Gomez",
    level: "B1",
    skill: "Speaking",
    topic: "work culture",
    exerciseType: "Role-play",
    createdAt: "May 20, 2026",
    summary: "Meeting warm-up, useful phrases, two client scenarios, and correction prompts."
  },
  {
    id: "mat-2",
    title: "Technical demo Q&A drills",
    studentId: "kenji-sato",
    studentName: "Kenji Sato",
    level: "B2",
    skill: "Speaking",
    topic: "technology",
    exerciseType: "Fluency drill",
    createdAt: "May 21, 2026",
    summary: "Timed answers, interruption phrases, and follow-up question practice."
  },
  {
    id: "mat-3",
    title: "Academic interview argument builder",
    studentId: "ana-kowalski",
    studentName: "Ana Kowalski",
    level: "C1",
    skill: "Speaking",
    topic: "research",
    exerciseType: "Discussion",
    createdAt: "May 19, 2026",
    summary: "Hedging language, claim-evidence-response frames, and interview prompts."
  },
  {
    id: "mat-4",
    title: "Travel problem listening follow-up",
    studentId: "maria-gomez",
    studentName: "Maria Gomez",
    level: "B1",
    skill: "Listening",
    topic: "travel",
    exerciseType: "Comprehension",
    createdAt: "May 17, 2026",
    summary: "Transcript-based listening questions with practical complaint language."
  },
  {
    id: "mat-5",
    title: "City directions picture prompts",
    studentId: "lucas-martin",
    studentName: "Lucas Martin",
    level: "A2",
    skill: "Vocabulary",
    topic: "cities",
    exerciseType: "Guided practice",
    createdAt: "May 18, 2026",
    summary: "Simple map language, question forms, and short speaking turns."
  }
];

export const weeklyLessonPlan = [
  {
    day: "Monday",
    studentId: "maria-gomez",
    time: "09:00",
    focus: "Meeting updates",
    status: "Planned"
  },
  {
    day: "Tuesday",
    studentId: "kenji-sato",
    time: "18:30",
    focus: "Demo Q&A",
    status: "Draft"
  },
  {
    day: "Wednesday",
    studentId: "ana-kowalski",
    time: "11:00",
    focus: "Academic interview",
    status: "Planned"
  },
  {
    day: "Friday",
    studentId: "lucas-martin",
    time: "16:00",
    focus: "Directions and transport",
    status: "Needs materials"
  }
];

export const lessonStructure = [
  {
    title: "Warm-up",
    detail: "Start with a personal check-in connected to the student topic memory."
  },
  {
    title: "Speaking task",
    detail: "Use a role-play or discussion prompt linked to the next suggested focus."
  },
  {
    title: "Vocabulary focus",
    detail: "Recycle 4-6 saved vocabulary items and add two new high-value phrases."
  },
  {
    title: "Listening/reading activity",
    detail: "Use a short authentic text or transcript at the student's CEFR level."
  },
  {
    title: "Correction & feedback",
    detail: "Track recurring mistakes and add corrected examples to the lesson notes."
  },
  {
    title: "Homework",
    detail: "Assign a short output task that reuses the lesson language."
  }
];

export function getStudentById(id: string) {
  return students.find((student) => student.id === id);
}

export function getMaterialsForStudent(studentId: string) {
  return materials.filter((material) => material.studentId === studentId);
}
