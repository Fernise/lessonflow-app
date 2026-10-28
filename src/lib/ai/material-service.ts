import OpenAI from "openai";
import type { CefrLevel } from "@/lib/types";
import { getRecentlyStudiedTopics, getStudentReviewNeeds, getSuggestedNextTopics } from "@/lib/student-memory";
import type {
  GeneratedMaterialContent,
  GapFillFocus,
  LessonGenerationMode,
  ListeningExerciseLength,
  ListeningExerciseType,
  MaterialType,
  QuizType,
  RoleplayContext,
  TeachingStudent,
  VocabularyDensity
} from "@/lib/teaching-types";

export type AiMaterialRequest = {
  student: TeachingStudent;
  materialType: MaterialType;
  level: CefrLevel;
  topic: string;
  skillFocus: string;
  duration: string;
  extraInstructions: string;
  variation: number;
  mode: LessonGenerationMode;
  youtubeUrl?: string;
  transcript?: string;
  listeningExerciseType?: ListeningExerciseType;
  gapFillFocus?: GapFillFocus;
  numberOfGaps?: string;
  vocabularyDensity?: VocabularyDensity;
  listeningLength?: ListeningExerciseLength;
  quizType?: QuizType;
  quizQuestionCount?: string;
  roleplayScenarioCount?: string;
  roleplayContext?: RoleplayContext;
};

export class AiServiceError extends Error {
  constructor(
    public code: "missing_api_key" | "rate_limit" | "failed_request" | "invalid_response",
    message: string
  ) {
    super(message);
  }
}

export type AiGenerationDebug = {
  model: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
};

export async function generateTeachingMaterial(
  input: AiMaterialRequest
): Promise<{ content: GeneratedMaterialContent; debug: AiGenerationDebug }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new AiServiceError("missing_api_key", "OPENAI_API_KEY is not configured. Add it to your environment to generate materials.");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const startedAt = Date.now();

  try {
    const response = await openai.chat.completions.create({
      model,
      temperature: input.variation > 1 ? 0.78 : 0.62,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are LessonFlow, an expert assistant for online language tutors. Generate practical, student-specific lesson materials in a natural, professional tutor tone. Return only valid JSON."
        },
        {
          role: "user",
          content: buildMaterialPrompt(input)
        }
      ]
    });

    const content = normalizeGeneratedContent(response.choices[0]?.message?.content || "", input);
    return {
      content,
      debug: {
        model,
        durationMs: Date.now() - startedAt,
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens
      }
    };
  } catch (error) {
    if (isOpenAiRateLimit(error)) {
      throw new AiServiceError("rate_limit", "OpenAI rate limit reached. Please wait a moment and try again.");
    }
    if (error instanceof AiServiceError) throw error;
    throw new AiServiceError("failed_request", "OpenAI generation failed. Check your API key, model access, and network connection.");
  }
}

export function buildPromptContext(student: TeachingStudent) {
  const recentlyStudiedTopics = getRecentlyStudiedTopics(student, 8);
  const suggestedNextTopics = getSuggestedNextTopics(student, 6);
  const studentReviewNeeds = getStudentReviewNeeds(student, 8);
  return {
    level: student.level,
    goals: student.goals,
    interests: student.interests,
    preferredTopics: student.preferredTopics,
    recurringMistakes: student.recurringMistakes,
    grammarWeaknesses: student.grammarWeaknesses,
    vocabularyToReview: student.vocabularyToReview,
    pronunciationNotes: student.pronunciationNotes,
    speakingConfidence: student.speakingConfidence,
    listeningWeaknesses: student.listeningWeaknesses,
    previousLessons: student.lessonHistory.slice(0, 6).map((lesson) => ({
      title: lesson.title,
      topic: lesson.topic,
      focus: lesson.focus,
      homeworkAssigned: lesson.homeworkAssigned,
      notes: lesson.notes
    })),
    previousLessonTopic: student.lessonHistory[0]?.topic || student.lessonHistory[0]?.title || "",
    recentlyStudiedTopics,
    topicsToAvoidOrDeprioritize: [...student.avoidedTopics, ...student.repeatedTopics, ...recentlyStudiedTopics.slice(0, 3)].filter(Boolean),
    suggestedNextTopics,
    studentReviewNeeds,
    notesForNextClass: student.notesForNextClass,
    memorySummary: student.memorySummary,
    weakSkills: [
      ...student.grammarWeaknesses.map((item) => `Grammar: ${item}`),
      ...student.listeningWeaknesses.map((item) => `Listening: ${item}`),
      ...student.pronunciationNotes.map((item) => `Pronunciation: ${item}`)
    ]
  };
}

function buildMaterialPrompt(input: AiMaterialRequest) {
  const density = getConversationDensity(input.duration);
  const professionalContext = inferProfessionalContext(input.student);

  if (input.materialType === "Speaking questions") {
    const context = buildPromptContext(input.student);
    return `
Create premium reusable conversational teaching assets for real 1-to-1 online classes.

Teacher brief:
- Target level: ${input.level} (flexible difficulty only, not fixed stages)
- Topic: ${input.topic || input.student.nextSuggestedFocus || "teacher-selected practical topic"}
- Skill focus: ${input.skillFocus}
- Estimated duration: ${input.duration}
- Extra instructions: ${input.extraInstructions || "No extra instructions"}
- Professional context: ${professionalContext}

Student context JSON:
${JSON.stringify(context, null, 2)}

Output constraints (strict):
- Return ONLY this JSON shape.
- Generate speaking discussion material only.
- Do NOT generate homework, lesson plans, or extra sections.
- Include concise useful vocabulary + useful phrases to support natural conversation.
- No objectives, activities, warm-up, lesson stages, teacher notes, correction sections, or step-by-step instructions.
- Natural, human, tutor-friendly language.
- English only. No translations.
- B1/B2/C1 are flexible question banks, not fixed class stages.
- Duration controls density only:
  - 25-40 min speaking classes: substantial discussion density.
  - Easier questions: ${density.easierMin}-${density.easierMax}
  - Main discussion: ${density.mainMin}-${density.mainMax}
  - Deeper discussion: ${density.deeperMin}-${density.deeperMax}
- These are target ranges, not rigid fixed counts, but do not under-generate.
- The example JSON below is structural only, not a quantity cap.
- Do NOT force equal numbers across sections.
- Distribute question depth naturally by topic, student level, speaking mode, and professional/technical complexity.
- Question quality > question quantity. Avoid generic filler and shallow yes/no prompts.
- Prefer questions that trigger follow-up, opinions, and storytelling.
- Questions should support disagreement, comparison, hypothesis, and real examples.
- Adapt depth to student profile:
  - technical/professional student => more professional/technical depth
  - non-technical student => practical accessible language
- Use student goals, interests, common mistakes, vocabulary to review, suggested next topics, and recent topic history.
- Avoid repeating recently studied topics unless the teacher explicitly selected the same topic.
- If the selected topic overlaps with recent history, approach it from a fresh angle.
- Mode style:
  - Conversational: casual real-life tone
  - Business: same structure but business/professional framing
  - Debate: include claim/counterclaim tension and challenge questions
  - Exam prep: clearer structured prompts with exam-style depth
- Do not include student name in title/header text.

Return valid JSON using exactly these keys:
{
  "title": "Speaking Questions",
  "estimated_duration": "${input.duration}",
  "student_sheet": {
    "topic": "clear topic label",
    "level_label": "Level ${input.level}",
    "status_label": "Introduced",
    "skill_label": "Speaking",
    "vocabulary": ["term/chunk → concise practical explanation"],
    "useful_phrases": ["natural phrase"],
    "speaking_questions": {
      "easier": ["question"],
      "main": ["question"],
      "deeper": ["question"]
    }
  }
}
`;
  }

  if (input.materialType === "Roleplay") {
    const context = buildPromptContext(input.student);
    const scenarioCount = parseCount(input.roleplayScenarioCount || input.duration, 3);
    return `
Create premium roleplay speaking material for a 1-to-1 online class.

Topic: ${input.topic || input.student.nextSuggestedFocus || "teacher-selected practical topic"}
Level: ${input.level}
Number of scenarios: ${scenarioCount}
Mode/context: ${input.roleplayContext || "Casual"}
Teaching focus: ${input.skillFocus}
Professional context: ${professionalContext}

Student context JSON:
${JSON.stringify(context, null, 2)}

Rules:
- Roleplay material must generate ONLY realistic roleplay scenarios.
- Do NOT output vocabulary, useful phrases, speaking question banks, quizzes, lesson plans, homework, or extra activities.
- No theatrical/fantasy/childish scenarios.
- Keep scenarios realistic and communication-focused.
- Include tension/goals/conflicts or decisions to discuss.
- No scripted timeline, no classroom stage instructions.
- Match level ${input.level} and the selected context.
- Generate exactly ${scenarioCount} distinct realistic situations.
- Fewer scenarios => tighter and simpler. More scenarios => more varied situations and richer context.
- Personalize scenarios using student goals, interests, common mistakes, vocabulary gaps, and suggested next topics.
- Avoid repeating recent lesson topics unless the teacher explicitly selected the same topic.

Return valid JSON using exactly these keys:
{
  "title": "Roleplay Situations",
  "estimated_duration": "${scenarioCount} scenarios",
  "student_sheet": {
    "roleplay_scenarios": [
      {
        "title": "scenario title",
        "situation": "short realistic situation",
        "discuss": ["prompt", "prompt", "prompt"]
      }
    ]
  }
}
`;
  }

  if (input.materialType === "Vocabulary sheet") {
    const context = buildPromptContext(input.student);
    const vocabDensity = getVocabularyDensity(input.vocabularyDensity || input.duration, input.level, professionalContext);
    return `
Create a premium reusable topic-based vocabulary sheet for 1-to-1 online tutoring.

Topic: ${input.topic || input.student.nextSuggestedFocus || "teacher-selected practical topic"}
Level: ${input.level}
Vocabulary density: ${input.vocabularyDensity || input.duration || "Standard"}
Professional context: ${professionalContext}

Student context JSON:
${JSON.stringify(context, null, 2)}

Rules:
- Generate vocabulary material only.
- No speaking question banks, no lesson scripts, no homework by default.
- Keep concise, practical, and reusable.
- English only. No translations.
- Vocabulary structure must emerge naturally from the topic itself.
- Do not use fixed universal categories. Choose natural semantic groupings for this exact topic.
- Prioritize chunks, collocations, conversational expressions, and professional real-world language.
- Avoid flat dictionary lists, repetitive synonyms, and generic abstract noun piles.
- Keep it readable and premium (organized, not overwhelming).
- Target density for 25-45 min vocabulary-oriented sessions:
  - about ${vocabDensity.sectionsMin}-${vocabDensity.sectionsMax} semantic sections
  - about ${vocabDensity.itemsPerSectionMin}-${vocabDensity.itemsPerSectionMax} items per section
  - about ${vocabDensity.phrasesMin}-${vocabDensity.phrasesMax} useful phrases total
  - target roughly ${vocabDensity.totalMin}-${vocabDensity.totalMax} total useful expressions/chunks
- Prioritize vocabulary that supports the student's goals, interests, review needs, common mistakes, and next suggested topics.
- Avoid simply recreating vocabulary from recently studied topics unless the teacher asks for review.

Return valid JSON using exactly these keys:
{
  "title": "topic title only",
  "estimated_duration": "${input.vocabularyDensity || input.duration || "Standard"}",
  "student_sheet": {
    "topic": "clear topic label",
    "level_label": "Level ${input.level}",
    "status_label": "Introduced",
    "skill_label": "Vocabulary",
    "vocabulary_sections": [
      {
        "title": "natural semantic section title",
        "items": ["term/chunk → concise practical explanation"]
      }
    ],
    "useful_phrases": ["natural phrase", "natural phrase"]
  }
}
`;
  }

  if (input.materialType === "Quiz") {
    const context = buildPromptContext(input.student);
    const quizDensity = getQuizDensity(input.quizQuestionCount || input.duration, input.level, input.quizType || "Mixed review");
    return `
Create a premium ESL quiz sheet for 1-to-1 review.

Topic: ${input.topic || input.student.nextSuggestedFocus || "teacher-selected practical topic"}
Level: ${input.level}
Quiz type: ${input.quizType || "Mixed review"}
Number of questions: ${input.quizQuestionCount || input.duration || "10 questions"}
Teaching focus: ${input.skillFocus}

Student context JSON:
${JSON.stringify(context, null, 2)}

Rules:
- Generate only quiz content (no lesson plan, no homework, no roleplay).
- Keep concise, clean, and practical.
- English only.
- Questions should review vocabulary + speaking readiness naturally.
- Adjust question style by quiz type and level complexity.
- Target counts for this request:
  - Quick Check: ${quizDensity.quickCheckMin}-${quizDensity.quickCheckMax}
  - Complete the Sentence: ${quizDensity.gapMin}-${quizDensity.gapMax}
  - Explain in Your Own Words: ${quizDensity.explainMin}-${quizDensity.explainMax}
  - Mini Speaking Challenge: ${quizDensity.speakingMin}-${quizDensity.speakingMax}
- B1: clearer wording and practical contexts.
- B2/C1: more nuanced wording, trade-offs, and argument depth.
- Use the student's common mistakes, vocabulary gaps, weak skills, and recent lesson topics to decide what to review.
- Avoid making the quiz a repeat of the most recent lesson unless the teacher requests review.

Return valid JSON using exactly these keys:
{
  "title": "Quiz title",
  "estimated_duration": "${input.quizQuestionCount || input.duration || "10 questions"}",
  "student_sheet": {
    "topic": "${input.topic || input.student.nextSuggestedFocus || "Quiz Topic"}",
    "level_label": "Level ${input.level}",
    "status_label": "Introduced",
    "skill_label": "Focus: Vocabulary / Speaking review",
    "quiz_sections": [
      {
        "title": "✅ Quick Check",
        "items": ["multiple choice question"]
      },
      {
        "title": "✍️ Complete the Sentence",
        "items": ["sentence with a gap"]
      },
      {
        "title": "🗣️ Explain in Your Own Words",
        "items": ["prompt"]
      },
      {
        "title": "💬 Mini Speaking Challenge",
        "items": ["question"]
      }
    ]
  }
}
`;
  }

  if (input.materialType === "Listening activity") {
    const context = buildPromptContext(input.student);
    const listeningLength = input.listeningLength || normalizeListeningLength(input.duration);
    const listeningDensity = getListeningDensity(listeningLength, input.listeningExerciseType || "Both");
    const includesGapFill = input.listeningExerciseType === "Gap Fill" || input.listeningExerciseType === "Both" || !input.listeningExerciseType;
    const requestedGaps = includesGapFill ? parseCount(input.numberOfGaps || "", listeningDensity.gapFillMax || 10) : 0;
    const cefrGuidance = getListeningCefrGuidance(input.level);
    return `
Create a premium listening activity for a real 1-to-1 online ESL class using a YouTube transcript.

Teacher topic/intention: ${input.topic || "Infer the topic from the transcript"}
Level: ${input.level}
Exercise length/density: ${listeningLength}
Exercise type: ${input.listeningExerciseType || "Both"}
Gap Fill Focus: ${input.gapFillFocus || "Topic Vocabulary"}
Number of gaps requested: ${requestedGaps}
Teaching focus: ${input.skillFocus}
YouTube URL: ${input.youtubeUrl || "not provided"}

Student context JSON:
${JSON.stringify(context, null, 2)}

Clean transcript:
${input.transcript || "Transcript unavailable"}

CEFR adaptation rules:
${cefrGuidance}

Rules:
- Use the transcript as the source material.
- Generate listening exercises only, not a full lesson plan.
- Include the cleaned transcript in the output.
- If the transcript is shortened or lightly simplified for readability, preserve the original meaning and adapt the simplification to CEFR ${input.level}.
- If teacher topic/intention is provided, prioritize vocabulary and phrases related to that topic when choosing gap-fill words and statements.
- If no topic is provided, infer the topic from the transcript.
- Do not invent facts outside the transcript.
- Exercise type controls sections:
  - True/False => only a True / False section.
  - Gap Fill => only a Gap Fill section.
  - Both => include both sections.
- Adjust density to exercise length and level:
  - True/False items target: ${listeningDensity.trueFalseMin}-${listeningDensity.trueFalseMax}
  - Gap Fill blanks target: ${requestedGaps}-${requestedGaps}
  - Follow-up discussion target: ${listeningDensity.discussionMin}-${listeningDensity.discussionMax}
- Keep questions practical, natural, and connected to the transcript.
- Add a Key Vocabulary section with 8-15 useful words from or strongly connected to the transcript/topic.
- Key Vocabulary format per item: "Word → Definition. Example: sentence."
- Key Vocabulary selection:
  - B1: frequent, practical vocabulary that helps basic comprehension.
  - B2: topic-specific vocabulary, workplace/professional terms when relevant, and useful collocations.
  - C1/C2: advanced vocabulary, nuanced collocations, discourse-level language, and complex expressions.
- Avoid obvious words, dictionary filler, and words that are too basic for CEFR ${input.level}.
- Add a Useful Expressions section with 3-8 natural spoken expressions, chunks, collocations, or phrases from or related to the transcript.
- Useful Expressions format per item: "Expression → Meaning. Example: sentence."
- Do not create a separate Idioms section yet.
- Gap Fill must include transcript-based sentences or short transcript excerpts with clear blanks plus a word bank.
- Gap Fill selection priority:
  1. Topic vocabulary related to "${input.topic || "the inferred topic"}".
  2. CEFR ${input.level}-appropriate vocabulary that is useful for this student.
  3. Useful expressions, chunks, and collocations that support real communication.
  4. Important content words needed to understand the message.
- Apply the selected Gap Fill Focus:
  - Topic Vocabulary: mostly choose topic-specific words/chunks.
  - General Vocabulary: choose useful level-appropriate everyday/professional vocabulary.
  - Expressions & Phrases: choose collocations, chunks, phrasal verbs, and natural expressions.
  - Mixed: balance topic words, level vocabulary, expressions, and content words.
- Avoid removing random function words, articles, auxiliaries, pronouns, basic prepositions, or filler words unless they are part of a useful expression.
- Prefer meaningful learning vocabulary over easy-to-guess grammar words.
- Preserve transcript readability: do not blank too many words in one sentence, and do not make the listening text feel broken.
- Use exact transcript words/phrases for blanks where possible. The word bank must match the removed words/phrases.
- True / False items should match the CEFR ${input.level} guidance above and be answerable from the transcript.
- Follow-up discussion questions must match CEFR ${input.level}: easier levels ask explicit comprehension and personal reaction; advanced levels ask implication, nuance, stance, and discourse-level interpretation.
- Follow-up discussion questions should reuse transcript ideas, Key Vocabulary, and Useful Expressions naturally.
- Adapt examples and follow-up questions to the student's goals, interests, review needs, common mistakes, and weak skills.
- If the listening topic overlaps with recent lessons, use the transcript to create a new angle instead of repeating the same discussion.
- English only. No Spanish translations.
- No homework by default. No step-by-step classroom script.

Return valid JSON using exactly these keys:
{
  "title": "topic or video title",
  "estimated_duration": "${listeningLength}",
  "student_sheet": {
    "topic": "clear topic or video topic",
    "level_label": "Level ${input.level}",
    "status_label": "Introduced",
    "skill_label": "Listening",
    "transcript": "clean readable transcript",
    "listening_exercises": [
      {
        "title": "✅ True / False",
        "items": ["statement"]
      },
      {
        "title": "✍️ Gap Fill",
        "items": ["sentence with one blank"]
      }
    ],
    "word_bank": ["word", "word"],
    "follow_up_discussion": ["natural discussion question"],
    "optional_vocabulary": [
      {
        "title": "Key Vocabulary",
        "items": ["word → concise definition. Example: natural example sentence."]
      },
      {
        "title": "Useful Expressions",
        "items": ["expression → meaning. Example: natural example sentence."]
      }
    ]
  }
}
`;
  }

  const promptBuilder = promptBuilders[input.materialType as keyof typeof promptBuilders];
  const context = buildPromptContext(input.student);

  return `
Create premium, natural 1-to-1 online speaking material for one teacher and one student.

Teacher brief:
- Student: ${input.student.name}
- Material type: ${input.materialType}
- Lesson mode: ${input.mode}
- Topic: ${input.topic || input.student.nextSuggestedFocus || "teacher-selected practical topic"}
- Skill focus: ${input.skillFocus}
- Estimated duration: ${input.duration}
- Variation number: ${input.variation}
- Extra instructions: ${input.extraInstructions || "No extra instructions"}

Student context JSON:
${JSON.stringify(context, null, 2)}

Material-specific guidance:
${promptBuilder ? promptBuilder(input) : "Keep the material concise, practical, and adaptive."}

Quality requirements:
- Output must feel natural and conversational, not worksheet-like.
- No CEFR sub-sections. One coherent flow at the target level.
- Avoid rigid stage scripting (no "After 2 minutes", no "Step 1").
- Homework is optional; include only if explicitly justified by context.
- Reuse student memory naturally: goals, recent mistakes, weak skills, and recycled vocabulary.
- Avoid repeating topics listed in "avoid repeating" unless explicitly requested.
- Prioritize useful modern vocabulary, natural speaking questions, adaptive follow-ups.

Return valid JSON using exactly these keys:
{
  "title": "short premium title",
  "objective": "one-line practical objective",
  "estimated_duration": "${input.duration}",
  "student_sheet": {
    "topic": "clear topic label",
    "vocabulary": ["useful modern words/chunks"],
    "useful_phrases": ["natural phrases for conversation"],
    "speaking_questions": ["natural progressively deeper questions"],
    "deeper_discussion_question": "optional deeper question or empty string"
  },
  "teacher_notes": {
    "correction_focus": ["high-value correction points"],
    "follow_up_ideas": ["adaptive follow-up ideas"],
    "conversation_expansion": ["ways to extend the conversation naturally"],
    "possible_issues": ["likely grammar/pronunciation issues to watch"]
  }
}
`;
}

const promptBuilders: Record<MaterialType, (input: AiMaterialRequest) => string> = {
  "Speaking questions": (input) =>
    `Design for fluid tutor-student speaking momentum in ${input.mode} mode with realistic prompts for ${input.skillFocus}.`,
  "Vocabulary sheet": () =>
    "Prioritize recycling known vocabulary through retrieval, sentence building, and personalized production. Include spacing/review logic.",
  Quiz: () =>
    "Create a short quiz with varied question types, but return it as lesson material rather than answer-key-heavy test prep.",
  Roleplay: () =>
    "Create only realistic roleplay scenarios tailored to level, context, and duration.",
  "Listening activity": () =>
    "Create only listening comprehension material from the supplied YouTube transcript."
};

function normalizeGeneratedContent(rawContent: string, input: AiMaterialRequest): GeneratedMaterialContent {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawContent) as Record<string, unknown>;
  } catch {
    throw new AiServiceError("invalid_response", "OpenAI returned an invalid response. Try regenerating.");
  }

  const get = (...keys: string[]) => keys.map((key) => parsed[key]).find((value) => value !== undefined);
  const vocabularyRaw = get("vocabulary");
  const vocabulary = Array.isArray(vocabularyRaw)
    ? vocabularyRaw.map((item) => ({
        term: String(item?.term || "").trim(),
        task: String(item?.task || "").trim()
      })).filter((item) => item.term && item.task)
    : [];

  const teacherInstructions = asStringArray(get("teacher_instructions", "teacherInstructions"));
  const studentInstructions = asStringArray(get("student_instructions", "studentInstructions"));
  const speakingPrompts = asStringArray(get("speaking_prompts", "speakingPrompts"));
  const correctionFocus = asStringArray(get("correction_focus", "correctionsFocus"));
  const vocabularyFocus = asStringArray(get("vocabulary_focus", "vocabularyFocus"));
  const activitySteps = asStringArray(get("main_activity", "activitySteps", "activities"));
  const studentSheetRaw = get("student_sheet", "studentSheet") as Record<string, unknown> | undefined;
  const speakingQuestionsRaw = studentSheetRaw?.speaking_questions as
    | { easier?: unknown; main?: unknown; deeper?: unknown }
    | undefined;
  const speakingQuestionsArrayFallback = asStringArray(studentSheetRaw?.speaking_questions);
  const teacherNotesRaw = get("teacher_notes", "teacherNotes") as Record<string, unknown> | undefined;
  const easierQuestions = asStringArray(speakingQuestionsRaw?.easier);
  const mainDiscussionQuestions = asStringArray(speakingQuestionsRaw?.main);
  const deeperDiscussionQuestions = asStringArray(speakingQuestionsRaw?.deeper);
  const roleplayRaw = studentSheetRaw?.optional_roleplay as { scenario?: unknown; questions?: unknown } | undefined;
  const quizSectionsRaw = studentSheetRaw?.quiz_sections as Array<{ title?: unknown; items?: unknown }> | undefined;
  const listeningExercisesRaw = studentSheetRaw?.listening_exercises as Array<{ title?: unknown; items?: unknown }> | undefined;
  const optionalVocabularyRaw = studentSheetRaw?.optional_vocabulary as Array<{ title?: unknown; items?: unknown }> | undefined;
  const roleplayScenariosRaw = studentSheetRaw?.roleplay_scenarios as
    | Array<{ title?: unknown; situation?: unknown; discuss?: unknown }>
    | undefined;
  const roleplayScenarios = Array.isArray(roleplayScenariosRaw)
    ? roleplayScenariosRaw
        .map((item) => ({
          title: String(item?.title || "").trim(),
          situation: String(item?.situation || "").trim(),
          discuss: asStringArray(item?.discuss)
        }))
        .filter((item) => item.title && item.situation && item.discuss.length > 0)
    : [];
  const quizSections = Array.isArray(quizSectionsRaw)
    ? quizSectionsRaw
        .map((section) => ({
          title: String(section?.title || "").trim(),
          items: asStringArray(section?.items)
        }))
        .filter((section) => section.title && section.items.length > 0)
    : [];
  const listeningExercises = Array.isArray(listeningExercisesRaw)
    ? listeningExercisesRaw
        .map((section) => ({
          title: String(section?.title || "").trim(),
          items: asStringArray(section?.items)
        }))
        .filter((section) => section.title && section.items.length > 0)
    : [];
  const optionalVocabulary = Array.isArray(optionalVocabularyRaw)
    ? optionalVocabularyRaw
        .map((section) => ({
          title: String(section?.title || "").trim(),
          items: asStringArray(section?.items)
        }))
        .filter((section) => section.title && section.items.length > 0)
    : [];
  const vocabularySectionsRaw = studentSheetRaw?.vocabulary_sections as Array<{ title?: unknown; items?: unknown }> | undefined;
  const parsedVocabularySections = Array.isArray(vocabularySectionsRaw)
    ? vocabularySectionsRaw
        .map((section) => ({
          title: String(section?.title || "").trim(),
          items: asStringArray(section?.items)
        }))
        .filter((section) => section.title && section.items.length > 0)
    : [];
  const sheetQuestions = [...easierQuestions, ...mainDiscussionQuestions, ...deeperDiscussionQuestions];
  const normalizedSheetQuestions = sheetQuestions.length ? sheetQuestions : speakingQuestionsArrayFallback;
  const isSimpleConversational = input.materialType === "Speaking questions" && (input.mode === "Conversational" || input.mode === "Business");
  const isRoleplayOnly = input.materialType === "Roleplay";
  const density = getConversationDensity(input.duration);
  const trimmedVocabulary = trimToRange(asStringArray(studentSheetRaw?.vocabulary), density.vocabMin, density.vocabMax);
  const trimmedEasier = ensureQuestionCount(
    trimToRange(easierQuestions, density.easierMin, density.easierMax),
    density.easierMin,
    "easier",
    input.topic
  );
  const trimmedMain = ensureQuestionCount(
    trimToRange(mainDiscussionQuestions, density.mainMin, density.mainMax),
    density.mainMin,
    "main",
    input.topic
  );
  const trimmedDeep = ensureQuestionCount(
    trimToRange(deeperDiscussionQuestions, density.deeperMin, density.deeperMax),
    density.deeperMin,
    "deeper",
    input.topic
  );
  const allTrimmedQuestions = [...trimmedEasier, ...trimmedMain, ...trimmedDeep];
  const finalQuestions = isSimpleConversational ? allTrimmedQuestions : normalizedSheetQuestions;

  const isVocabularyOnly = input.materialType === "Vocabulary sheet";
  const isQuizOnly = input.materialType === "Quiz";
  const isListeningOnly = input.materialType === "Listening activity";
  return {
    title: String(get("title") || `${input.materialType}: ${input.topic}`).trim(),
    objective: String(get("objective") || (isSimpleConversational ? "" : `Practise ${input.skillFocus.toLowerCase()} through ${input.topic}.`)).trim(),
    estimatedDuration: String(get("estimated_duration", "estimatedDuration") || input.duration).trim(),
    teacherInstructions,
    studentInstructions,
    activitySteps,
    activities: activitySteps,
    vocabulary: vocabulary.length ? vocabulary : fallbackVocabulary(input),
    vocabularyFocus: isSimpleConversational ? [] : vocabularyFocus.length ? vocabularyFocus : trimmedVocabulary,
    speakingPrompts: isVocabularyOnly || isRoleplayOnly || isQuizOnly || isListeningOnly ? [] : speakingPrompts.length ? speakingPrompts : finalQuestions,
    correctionsFocus: correctionFocus.length ? correctionFocus : asStringArray(teacherNotesRaw?.correction_focus),
    followUpQuestions: asStringArray(get("follow_up_questions", "followUpQuestions")),
    homeworkSuggestion: String(get("homework", "homeworkSuggestion") || "").trim(),
    studentSheet: studentSheetRaw
      ? {
          topic: String(studentSheetRaw.topic || input.topic || "").trim(),
          levelLabel: String(studentSheetRaw.level_label || `Level ${input.level}`).trim(),
          statusLabel: String(studentSheetRaw.status_label || "Introduced").trim(),
          skillLabel: String(studentSheetRaw.skill_label || (isListeningOnly ? "Listening" : "Speaking")).trim(),
          vocabulary: isSimpleConversational || isRoleplayOnly || isListeningOnly ? [] : asStringArray(studentSheetRaw.vocabulary),
          usefulPhrases: isSimpleConversational || isRoleplayOnly || isListeningOnly ? [] : asStringArray(studentSheetRaw.useful_phrases),
          speakingQuestions: isVocabularyOnly || isRoleplayOnly || isQuizOnly || isListeningOnly ? [] : finalQuestions,
          easierQuestions: isVocabularyOnly || isRoleplayOnly || isQuizOnly || isListeningOnly ? [] : isSimpleConversational ? trimmedEasier : easierQuestions,
          mainDiscussionQuestions: isVocabularyOnly || isRoleplayOnly || isQuizOnly || isListeningOnly ? [] : isSimpleConversational ? trimmedMain : mainDiscussionQuestions,
          deeperDiscussionQuestions: isVocabularyOnly || isRoleplayOnly || isQuizOnly || isListeningOnly ? [] : isSimpleConversational ? trimmedDeep : deeperDiscussionQuestions,
          deeperDiscussionQuestion: String(studentSheetRaw.deeper_discussion_question || "").trim(),
          optionalRoleplayScenario: isSimpleConversational ? "" : String(roleplayRaw?.scenario || "").trim(),
          optionalRoleplayQuestions: isSimpleConversational ? [] : asStringArray(roleplayRaw?.questions),
          roleplayScenarios,
          vocabularySections: parsedVocabularySections,
          quizSections,
          transcript: String(studentSheetRaw.transcript || input.transcript || "").trim(),
          listeningExercises,
          wordBank: asStringArray(studentSheetRaw.word_bank),
          followUpDiscussion: asStringArray(studentSheetRaw.follow_up_discussion),
          optionalVocabulary
        }
      : undefined,
    teacherNotes: teacherNotesRaw
      ? {
          correctionFocus: asStringArray(teacherNotesRaw.correction_focus),
          followUpIdeas: asStringArray(teacherNotesRaw.follow_up_ideas),
          conversationExpansion: asStringArray(teacherNotesRaw.conversation_expansion),
          possibleIssues: asStringArray(teacherNotesRaw.possible_issues)
        }
      : undefined
  };
}

function getConversationDensity(duration: string) {
  const minutes = Number.parseInt(duration, 10) || 45;
  if (minutes <= 15) {
    return { vocabMin: 4, vocabMax: 5, questionsMin: 4, questionsMax: 5, easierMin: 2, easierMax: 2, mainMin: 1, mainMax: 2, deeperMin: 1, deeperMax: 1 };
  }
  if (minutes <= 40) {
    return {
      vocabMin: 5,
      vocabMax: 7,
      questionsMin: 17,
      questionsMax: 26,
      easierMin: 4,
      easierMax: 6,
      mainMin: 6,
      mainMax: 10,
      deeperMin: 7,
      deeperMax: 10
    };
  }
  if (minutes <= 60) {
    return { vocabMin: 8, vocabMax: 10, questionsMin: 18, questionsMax: 28, easierMin: 4, easierMax: 7, mainMin: 7, mainMax: 10, deeperMin: 7, deeperMax: 11 };
  }
  return { vocabMin: 8, vocabMax: 10, questionsMin: 20, questionsMax: 30, easierMin: 5, easierMax: 8, mainMin: 8, mainMax: 11, deeperMin: 8, deeperMax: 12 };
}

function trimToMax(items: string[], max: number) {
  return items.filter(Boolean).slice(0, Math.max(0, max));
}

function trimToRange(items: string[], min: number, max: number) {
  const trimmed = trimToMax(items, max);
  return trimmed.length >= min ? trimmed : trimmed;
}

function trimByWeight(items: string[], minTotal: number, maxAllowed: number, share: number) {
  const preferred = Math.max(1, Math.round(minTotal * share));
  return trimToMax(items, Math.max(preferred, Math.min(maxAllowed, items.length)));
}

function inferProfessionalContext(student: TeachingStudent) {
  const blob = [...student.goals, ...student.interests, ...student.preferredTopics].join(" ").toLowerCase();
  const professionalSignals = ["work", "client", "meeting", "business", "project", "team", "manager", "career", "interview", "engineering", "product"];
  return professionalSignals.some((signal) => blob.includes(signal))
    ? "Professional/technical"
    : "General/non-technical";
}

function getVocabularyDensity(density: string, level: CefrLevel, professionalContext: string) {
  const richContextBoost = professionalContext === "Professional/technical" || level === "C1" || level === "C2";
  if (density === "Short") {
    return {
      sectionsMin: 3,
      sectionsMax: 4,
      itemsPerSectionMin: 6,
      itemsPerSectionMax: 8,
      phrasesMin: 5,
      phrasesMax: 8,
      totalMin: 20,
      totalMax: richContextBoost ? 34 : 30
    };
  }
  if (density === "Rich") {
    return {
      sectionsMin: 4,
      sectionsMax: 5,
      itemsPerSectionMin: 8,
      itemsPerSectionMax: 10,
      phrasesMin: 8,
      phrasesMax: 12,
      totalMin: 30,
      totalMax: richContextBoost ? 44 : 40
    };
  }
  return {
    sectionsMin: 4,
    sectionsMax: 5,
    itemsPerSectionMin: 7,
    itemsPerSectionMax: 10,
    phrasesMin: 5,
    phrasesMax: 10,
    totalMin: 25,
    totalMax: richContextBoost ? 40 : 36
  };
}

function getQuizDensity(questionCount: string, level: CefrLevel, quizType: QuizType) {
  const total = parseCount(questionCount, 10);
  const advancedBoost = level === "C1" || level === "C2" ? 1 : 0;
  if (quizType === "Multiple choice") {
    return { quickCheckMin: total, quickCheckMax: total, gapMin: 0, gapMax: 0, explainMin: 0, explainMax: 0, speakingMin: 0, speakingMax: 0 };
  }
  if (quizType === "Gap fill") {
    return { quickCheckMin: 0, quickCheckMax: 0, gapMin: total, gapMax: total, explainMin: 0, explainMax: 0, speakingMin: 0, speakingMax: 0 };
  }
  if (quizType === "Speaking review") {
    const explain = Math.max(2, Math.round(total * 0.35) + advancedBoost);
    const speaking = Math.max(2, total - explain);
    return { quickCheckMin: 0, quickCheckMax: 0, gapMin: 0, gapMax: 0, explainMin: explain, explainMax: explain, speakingMin: speaking, speakingMax: speaking };
  }
  const quick = Math.max(1, Math.round(total * 0.3));
  const gap = Math.max(1, Math.round(total * 0.3));
  const explain = Math.max(1, Math.round(total * 0.2) + advancedBoost);
  const speaking = Math.max(1, total - quick - gap - explain);
  return {
    quickCheckMin: quick,
    quickCheckMax: quick,
    gapMin: gap,
    gapMax: gap,
    explainMin: explain,
    explainMax: explain,
    speakingMin: speaking,
    speakingMax: speaking
  };
}

function getListeningDensity(length: ListeningExerciseLength, exerciseType: ListeningExerciseType) {
  const includeTrueFalse = exerciseType === "True/False" || exerciseType === "Both";
  const includeGapFill = exerciseType === "Gap Fill" || exerciseType === "Both";
  const base =
    length === "Short"
      ? { tfMin: 4, tfMax: 5, gapMin: 4, gapMax: 5, discussionMin: 2, discussionMax: 3 }
      : length === "Extended"
        ? { tfMin: 8, tfMax: 10, gapMin: 8, gapMax: 10, discussionMin: 5, discussionMax: 6 }
        : { tfMin: 6, tfMax: 8, gapMin: 6, gapMax: 8, discussionMin: 4, discussionMax: 5 };
  return {
    trueFalseMin: includeTrueFalse ? base.tfMin : 0,
    trueFalseMax: includeTrueFalse ? base.tfMax : 0,
    gapFillMin: includeGapFill ? base.gapMin : 0,
    gapFillMax: includeGapFill ? base.gapMax : 0,
    discussionMin: base.discussionMin,
    discussionMax: base.discussionMax
  };
}

function normalizeListeningLength(value: string): ListeningExerciseLength {
  if (value === "Short" || value === "Standard" || value === "Extended") return value;
  return "Standard";
}

function getListeningCefrGuidance(level: CefrLevel) {
  if (level === "A1" || level === "A2") {
    return `- Transcript: keep only short, concrete excerpts if needed; simplify dense wording without changing facts.
- True/False: focus on explicit facts, speakers, actions, times, places, and very direct meaning.
- Gap Fill: choose high-frequency words, concrete nouns, everyday verbs, and simple topic words.
- Discussion: ask short personal-reaction questions with minimal inference.`;
  }
  if (level === "B1") {
    return `- Transcript: keep wording clear and readable; lightly simplify only dense sentences while preserving facts.
- True/False: test explicit comprehension and clear paraphrase; avoid subtle traps and heavy inference.
- Gap Fill: choose frequent useful vocabulary, practical topic words, and simple collocations.
- Discussion: ask direct personal/opinion questions with minimal inference and clear support from the transcript.`;
  }
  if (level === "B2") {
    return `- Transcript: preserve natural wording and useful collocations; clean filler without flattening meaning.
- True/False: include moderate inference, paraphrase, cause/effect, attitude, and contrast.
- Gap Fill: choose collocations, workplace/professional vocabulary when relevant, phrasal verbs, and precise content words.
- Discussion: ask questions about reasons, trade-offs, implications, and how ideas apply in professional or real-life contexts.`;
  }
  return `- Transcript: preserve nuance, discourse markers, hedging, stance, and complex expressions.
- True/False: test implicit ideas, speaker attitude, nuanced meaning, assumptions, and argument structure.
- Gap Fill: choose advanced vocabulary, discourse markers, complex expressions, collocations, hedging language, and abstract content words.
- Discussion: ask questions about implication, evaluation, bias, unstated assumptions, disagreement, and broader significance.`;
}

function parseCount(value: string, fallback: number) {
  const count = Number.parseInt(value, 10);
  return Number.isFinite(count) && count > 0 ? count : fallback;
}

function ensureQuestionCount(
  questions: string[],
  min: number,
  band: "easier" | "main" | "deeper",
  topic: string
) {
  if (questions.length >= min) return questions;
  const fallback = buildFallbackQuestions(band, topic);
  const merged = [...questions];
  for (const question of fallback) {
    if (merged.length >= min) break;
    if (!merged.includes(question)) merged.push(question);
  }
  return merged;
}

function buildFallbackQuestions(band: "easier" | "main" | "deeper", topic: string) {
  if (band === "easier") {
    return [
      `What is your personal relationship with ${topic}?`,
      `Can you share a recent everyday example connected to ${topic}?`,
      `What part of ${topic} feels easiest for you, and why?`,
      `What part of ${topic} still feels challenging?`
    ];
  }
  if (band === "main") {
    return [
      `How has ${topic} changed the way people communicate in your environment?`,
      `What trade-offs do people accept when they prioritize ${topic}?`,
      `Can you compare two different approaches people take toward ${topic}?`,
      `What consequences appear when ${topic} is handled poorly?`
    ];
  }
  return [
    `Should institutions be responsible for reducing the negative effects of ${topic}? Why or why not?`,
    `How might social values change over time because of ${topic}?`,
    `Which assumptions about ${topic} do you disagree with, and why?`,
    `If current trends continue, what long-term risks do you expect from ${topic}?`
  ];
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function fallbackVocabulary(input: AiMaterialRequest) {
  return (input.student.vocabularyToReview.length ? input.student.vocabularyToReview : ["clarify", "support", "summarize"]).slice(0, 6).map((term) => ({
    term,
    task: `Use "${term}" in a sentence about ${input.topic || input.student.nextSuggestedFocus}.`
  }));
}

function isOpenAiRateLimit(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "status" in error &&
      Number((error as { status?: number }).status) === 429
  );
}
