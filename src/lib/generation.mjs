export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function assertCefrLevel(level) {
  if (!CEFR_LEVELS.includes(level)) {
    throw new Error(`Unsupported CEFR level: ${level}`);
  }
}

export function buildLessonMessages({ inputText, cefrLevel }) {
  assertCefrLevel(cefrLevel);

  return [
    {
      role: "system",
      content:
        "You are LessonFlow, an expert EFL lesson planner. Return only valid JSON with the requested keys. Keep all tasks age-neutral and classroom-ready."
    },
    {
      role: "user",
      content: [
        `CEFR level: ${cefrLevel}`,
        "Create lesson support from this teacher-provided text or transcript.",
        "Return JSON with exactly these keys:",
        "- warmUpQuestions: array of 3 concise questions",
        "- vocabulary: array of 8 objects with term, definition, example",
        "- comprehensionQuestions: array of 5 questions",
        "- speakingTask: one practical communicative task",
        "- homework: one homework assignment",
        "",
        "Source text:",
        inputText
      ].join("\n")
    }
  ];
}

export function normalizeLessonContent(value) {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;

  return {
    warmUpQuestions: normalizeStringArray(parsed.warmUpQuestions, 3),
    vocabulary: normalizeVocabulary(parsed.vocabulary, 8),
    comprehensionQuestions: normalizeStringArray(parsed.comprehensionQuestions, 5),
    speakingTask: String(parsed.speakingTask || "").trim(),
    homework: String(parsed.homework || "").trim()
  };
}

export function createMockLessonContent({ inputText, cefrLevel }) {
  assertCefrLevel(cefrLevel);
  const topic = inferTopic(inputText);

  return {
    warmUpQuestions: [
      `What do you already know about ${topic}?`,
      `Which words or ideas from ${topic} feel important?`,
      `How might this topic connect to your daily life?`
    ],
    vocabulary: [
      ["context", "the situation around an idea", `The context helps us understand ${topic}.`],
      ["evidence", "facts that support an answer", "Use evidence from the text."],
      ["compare", "to say how things are similar or different", "Compare two opinions."],
      ["summarize", "to explain the main points briefly", "Summarize the first paragraph."],
      ["predict", "to say what may happen next", "Predict the speaker's next point."],
      ["benefit", "a good result or advantage", "One benefit is clearer communication."],
      ["challenge", "a difficult task or problem", "The main challenge is time."],
      ["reflect", "to think carefully about something", "Reflect on your answer."]
    ].map(([term, definition, example]) => ({ term, definition, example })),
    comprehensionQuestions: [
      `What is the main idea of the text about ${topic}?`,
      "Which detail best supports the main idea?",
      "What problem or question does the speaker describe?",
      "How does the text organize its ideas?",
      "What opinion can you infer from the text?"
    ],
    speakingTask: `In pairs, prepare a two-minute discussion about ${topic}. Student A summarizes the text, and Student B asks follow-up questions at ${cefrLevel} level.`,
    homework: `Write a short response about ${topic}. Include five vocabulary items from class and one personal opinion.`
  };
}

function normalizeStringArray(value, fallbackLength) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, fallbackLength);
}

function normalizeVocabulary(value, fallbackLength) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      term: String(item?.term || "").trim(),
      definition: String(item?.definition || "").trim(),
      example: String(item?.example || "").trim()
    }))
    .filter((item) => item.term && item.definition)
    .slice(0, fallbackLength);
}

function inferTopic(inputText) {
  const words = String(inputText || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 4);

  return words.slice(0, 3).join(" ") || "the text";
}
