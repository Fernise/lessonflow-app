import type { CefrLevel } from "./types";

export type SpeakingConfidence = "Low" | "Developing" | "Confident" | "Advanced";

export type LessonRecord = {
  id: string;
  date: string;
  rawDate?: string;
  title: string;
  focus: string;
  topic?: string;
  skillFocus?: string;
  lessonGoal?: string;
  durationMinutes?: number;
  status?: "planned" | "completed" | "cancelled";
  materialId?: string | null;
  materialTitle?: string;
  lessonStructure?: LessonStructure;
  topicsCovered: string[];
  homeworkAssigned: string;
  notes: string;
  teacherFeedback: string;
  studentPerformance?: string;
  newMistakesNoticed?: string[];
  vocabularyToReviewNext?: string[];
};

export type LessonStatus = "planned" | "completed" | "cancelled";

export type LessonPlanSummary = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  studentId: string;
  studentName: string;
  studentLevel: CefrLevel;
  materialId: string | null;
  materialTitle: string;
  rawDate: string;
  date: string;
  durationMinutes: number;
  status: LessonStatus;
  title: string;
  focus: string;
  topic: string;
  skillFocus: string;
  lessonGoal: string;
  lessonStructure: LessonStructure;
  teacherNotes: string;
  homeworkAssigned: string;
  studentPerformance: string;
};

export type LessonStructure = {
  warmUp: string;
  review: string;
  mainSpeakingTask: string;
  vocabularyActivation: string;
  listeningReadingActivity: string;
  correctionAndFeedback: string;
  homework: string;
  attachedMaterialIds?: string[];
};

export type AiSuggestions = {
  suggestedNextLessonTopic: string;
  vocabularyToRecycle: string[];
  suggestedSpeakingActivity: string;
  suggestedHomework: string;
};

export type TeachingStudent = {
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
  speakingConfidence: SpeakingConfidence;
  listeningWeaknesses: string[];
  avoidedTopics: string[];
  repeatedTopics: string[];
  strengths: string[];
  notesForNextClass: string;
  memoryItems: TeachingMemoryItem[];
  memorySummary: MemorySummary;
  lessonHistory: LessonRecord[];
  aiSuggestions: AiSuggestions;
  generatedMaterialIds: string[];
};

export type MemoryCategory =
  | "grammar"
  | "vocabulary"
  | "pronunciation"
  | "fluency"
  | "listening"
  | "confidence"
  | "homework"
  | "topic";

export type TeachingMemoryItem = {
  id: string;
  category: MemoryCategory;
  content: string;
  lessonId: string | null;
  createdAt: string;
};

export type MemorySummary = {
  reviewNext: string[];
  avoidRepeating: string[];
  suggestedNextLessonFocus: string;
  vocabularyToRecycle: string[];
  commonMistakes: string[];
};

export type TeachingMaterial = {
  id: string;
  title: string;
  studentId: string | null;
  studentName: string;
  level: CefrLevel;
  skill: string;
  topic: string;
  exerciseType: string;
  createdAt: string;
  summary: string;
  isFavorite: boolean;
  content?: GeneratedMaterialContent;
  metadata?: MaterialMetadata;
};

export type MaterialSkill = "Speaking" | "Listening" | "Vocabulary" | "Reading" | "Grammar";

export type MaterialMetadata = {
  topic: string;
  subtopic: string;
  level: CefrLevel;
  skills: MaterialSkill[];
  materialType: string;
  keywords: string[];
  vocabularyThemes: string[];
};

export type MaterialType =
  | "Speaking questions"
  | "Vocabulary sheet"
  | "Quiz"
  | "Roleplay"
  | "Listening activity";

export type LessonGenerationMode = "Conversational" | "Business" | "Debate" | "Exam prep";

export type ListeningExerciseType = "True/False" | "Gap Fill" | "Both";

export type GapFillFocus = "Topic Vocabulary" | "General Vocabulary" | "Expressions & Phrases" | "Mixed";

export type VocabularyDensity = "Short" | "Standard" | "Rich";

export type ListeningExerciseLength = "Short" | "Standard" | "Extended";

export type QuizType = "Mixed review" | "Multiple choice" | "Gap fill" | "Speaking review";

export type RoleplayContext = "Casual" | "Business" | "Customer" | "Interview" | "Conflict / negotiation";

export type GeneratedMaterialContent = {
  title: string;
  userTags?: string[];
  objective: string;
  estimatedDuration?: string;
  teacherInstructions?: string[];
  studentInstructions?: string[];
  activitySteps?: string[];
  activities?: string[];
  vocabulary: Array<{
    term: string;
    task: string;
  }>;
  vocabularyFocus?: string[];
  speakingPrompts?: string[];
  correctionsFocus?: string[];
  followUpQuestions?: string[];
  homeworkSuggestion?: string;
  studentSheet?: {
    topic: string;
    levelLabel?: string;
    statusLabel?: string;
    skillLabel?: string;
    sectionOrder?: string[];
    vocabulary: string[];
    usefulPhrases: string[];
    speakingQuestions: string[];
    easierQuestions?: string[];
    mainDiscussionQuestions?: string[];
    deeperDiscussionQuestions?: string[];
    deeperDiscussionQuestion?: string;
    optionalRoleplayScenario?: string;
    optionalRoleplayQuestions?: string[];
    roleplayScenarios?: Array<{
      title: string;
      situation: string;
      discuss: string[];
    }>;
    vocabularySections?: Array<{
      title: string;
      items: string[];
    }>;
    quizSections?: Array<{
      title: string;
      items: string[];
    }>;
    transcript?: string;
    listeningExercises?: Array<{
      title: string;
      items: string[];
    }>;
    wordBank?: string[];
    followUpDiscussion?: string[];
    optionalVocabulary?: Array<{
      title: string;
      items: string[];
    }>;
  };
  teacherNotes?: {
    correctionFocus: string[];
    followUpIdeas: string[];
    conversationExpansion: string[];
    possibleIssues: string[];
  };
};

export type AiGenerationHistoryItem = {
  id: string;
  studentId: string;
  materialId: string | null;
  materialType: string;
  topic: string;
  level: CefrLevel;
  skillFocus: string;
  duration: string;
  content: GeneratedMaterialContent;
  variation: number;
  createdAt: string;
};

export type WeeklyPreparationStatus = "draft" | "prepared" | "archived";

export type WeeklyPreparationSuggestion = {
  priorityLessons: Array<{
    studentId: string;
    studentName: string;
    lessonDate: string;
    topic: string;
    reason: string;
  }>;
  reusableMaterials: Array<{
    materialId: string;
    title: string;
    topic: string;
    studentNames: string[];
  }>;
  sharedTopics: Array<{
    topic: string;
    studentNames: string[];
  }>;
  vocabularyReviewList: string[];
  suggestedHomework: Array<{
    studentName: string;
    homework: string;
  }>;
  risksReminders: string[];
  checklist: Array<{
    studentId: string;
    studentName: string;
    lessonId: string | null;
    lessonStatus?: LessonStatus;
    lessonDate: string;
    topic: string;
    level: CefrLevel;
    suggestedNextFocus: string;
    lessonPlanReady: boolean;
    speakingMaterialReady: boolean;
    vocabularyMaterialReady: boolean;
    materialReady: boolean;
    homeworkReady: boolean;
    notesReady: boolean;
    reusableMaterialIds: string[];
    attachedMaterialIds?: string[];
  }>;
};

export type WeeklyPreparation = {
  id: string;
  weekStart: string;
  summary: string;
  suggestions: WeeklyPreparationSuggestion;
  status: WeeklyPreparationStatus;
  createdAt: string;
};

// Canonical database contract types (match production migration schema).
export type DbProfile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  auth_provider: string;
  teaching_context: string;
  created_at: string;
  updated_at: string;
};

export type DbStudent = {
  id: string;
  user_id: string;
  name: string;
  level: CefrLevel;
  native_language: string;
  goals: string[];
  interests: string[];
  lesson_frequency: string;
  notes: string;
  last_lesson_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbStudentMemory = {
  id: string;
  user_id: string;
  student_id: string;
  recurring_mistakes: string[];
  grammar_weaknesses: string[];
  vocabulary_to_review: string[];
  pronunciation_notes: string[];
  speaking_confidence: SpeakingConfidence;
  listening_weaknesses: string[];
  preferred_topics: string[];
  avoided_topics: string[];
  repeated_topics: string[];
  strengths: string[];
  notes_for_next_class: string;
  next_suggested_focus: string;
  created_at: string;
  updated_at: string;
};

export type DbLesson = {
  id: string;
  user_id: string;
  student_id: string;
  material_id: string | null;
  lesson_date: string;
  duration_minutes: number;
  status: LessonStatus;
  title: string;
  topic: string;
  skill_focus: string;
  lesson_goal: string;
  lesson_structure: LessonStructure;
  topics_covered: string[];
  homework_assigned: string;
  lesson_notes: string;
  teacher_feedback: string;
  student_performance: string;
  new_mistakes_noticed: string[];
  vocabulary_to_review_next: string[];
  created_at: string;
  updated_at: string;
};

export type DbMaterial = {
  id: string;
  user_id: string;
  student_id: string | null;
  title: string;
  level: CefrLevel;
  skill: string;
  topic: string;
  exercise_type: string;
  summary: string;
  content: GeneratedMaterialContent;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type DbVocabularyItem = {
  id: string;
  user_id: string;
  student_id: string;
  term: string;
  definition: string;
  example: string;
  status: "new" | "review" | "mastered";
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbWeeklyPreparation = {
  id: string;
  user_id: string;
  week_start: string;
  summary: string;
  suggestions: WeeklyPreparationSuggestion;
  status: WeeklyPreparationStatus;
  created_at: string;
  updated_at: string;
};
