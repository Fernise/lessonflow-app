export const cefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type CefrLevel = (typeof cefrLevels)[number];

export type LessonContent = {
  warmUpQuestions: string[];
  vocabulary: Array<{
    term: string;
    definition: string;
    example: string;
  }>;
  comprehensionQuestions: string[];
  speakingTask: string;
  homework: string;
};

export type LessonGeneration = {
  id: string;
  user_id: string;
  input_text: string;
  cefr_level: CefrLevel;
  result: LessonContent;
  created_at: string;
};
