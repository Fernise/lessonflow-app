import type { TeachingStudent } from "./teaching-types";

const topicSuggestionMap: Array<{ match: string[]; suggestions: string[] }> = [
  {
    match: ["technology", "ai", "artificial intelligence", "remote work", "digital"],
    suggestions: ["Future of Work", "Digital Privacy", "Social Media", "Online Habits"]
  },
  {
    match: ["hiring", "interview", "recruitment", "career", "job"],
    suggestions: ["Workplace Communication", "Professional Strengths", "Difficult Interview Questions", "Career Change"]
  },
  {
    match: ["travel", "culture", "holiday"],
    suggestions: ["Cultural Differences", "Travel Problems", "Local Recommendations", "Responsible Tourism"]
  },
  {
    match: ["meeting", "presentation", "business", "client"],
    suggestions: ["Handling Disagreement", "Client Expectations", "Giving Updates", "Negotiation"]
  }
];

const fallbackTopics = ["Daily Routines", "Work-Life Balance", "Decision Making", "Personal Goals", "Communication Habits"];

export function getRecentlyStudiedTopics(student: TeachingStudent, limit = 5) {
  return uniqueStrings(
    student.lessonHistory.flatMap((lesson) => [
      lesson.topic,
      lesson.title,
      ...(lesson.topicsCovered || [])
    ])
  ).slice(0, limit);
}

export function getMaterialsUsedCount(student: TeachingStudent) {
  return student.generatedMaterialIds.length;
}

export function getCompletedLessonsCount(student: TeachingStudent) {
  return student.lessonHistory.filter((lesson) => lesson.status === "completed").length;
}

export function getStudentReviewNeeds(student: TeachingStudent, limit = 4) {
  return uniqueStrings([
    ...student.grammarWeaknesses,
    ...student.vocabularyToReview,
    ...student.pronunciationNotes,
    ...student.listeningWeaknesses,
    ...student.memorySummary.reviewNext,
    ...student.memorySummary.commonMistakes
  ]).slice(0, limit);
}

export function getSuggestedNextTopics(student: TeachingStudent, limit = 4) {
  const recentTopics = getRecentlyStudiedTopics(student, 8);
  const avoidSet = new Set([...recentTopics, ...student.avoidedTopics, ...student.repeatedTopics].map(normalize));
  const studentTopicText = [...student.interests, ...student.preferredTopics, ...recentTopics, ...student.goals].join(" ").toLowerCase();
  const mapped = topicSuggestionMap
    .filter((group) => group.match.some((match) => studentTopicText.includes(match)))
    .flatMap((group) => group.suggestions);
  return uniqueStrings([
    student.nextSuggestedFocus,
    ...mapped,
    ...student.aiSuggestions.vocabularyToRecycle.map((item) => `${item} in conversation`),
    ...fallbackTopics
  ])
    .filter((topic) => !avoidSet.has(normalize(topic)))
    .slice(0, limit);
}

export function uniqueStrings(items: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return items
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item) => {
      const key = normalize(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
