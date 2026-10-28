import type { LessonStructure } from "./teaching-types";

export function defaultLessonStructure(topic: string, skillFocus: string): LessonStructure {
  const lessonTopic = topic || "the lesson topic";
  const skill = skillFocus || "communication";
  return {
    warmUp: `Start with two personal questions about ${lessonTopic}.`,
    review: "Recycle vocabulary and corrections from the previous lesson.",
    mainSpeakingTask: `Run a guided ${skill.toLowerCase()} task connected to ${lessonTopic}.`,
    vocabularyActivation: "Students use 4-6 target words in short examples before freer practice.",
    listeningReadingActivity: `Use a short text or transcript about ${lessonTopic} for gist and detail questions.`,
    correctionAndFeedback: "Pause after the main task to correct recurring mistakes and upgrade one sentence.",
    homework: `Assign a short written or recorded response about ${lessonTopic}.`
  };
}
