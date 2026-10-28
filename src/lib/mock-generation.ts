import type { CefrLevel } from "./types";
import { getSuggestedNextTopics } from "./student-memory";
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
} from "./teaching-types";

export type MaterialGenerationInput = {
  student: TeachingStudent;
  materialType: MaterialType;
  level: CefrLevel;
  topic: string;
  skillFocus: string;
  duration: string;
  extraInstructions: string;
  mode?: LessonGenerationMode;
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

export function generateMockMaterial(input: MaterialGenerationInput): GeneratedMaterialContent {
  const suggestedTopics = getSuggestedNextTopics(input.student, 3);
  const topic = input.topic || suggestedTopics[0] || input.student.nextSuggestedFocus || input.student.interests[0] || "personal goals";
  const vocabulary = input.student.vocabularyToReview.slice(0, 6);
  const mistakes = input.student.recurringMistakes.slice(0, 2);
  const previousLesson = input.student.lessonHistory[0]?.title || "the previous lesson";
  const duration = input.duration || "45 minutes";

  if (input.materialType === "Roleplay") {
    const requestedScenarios = parseCount(input.roleplayScenarioCount || duration, 3);
    const baseScenarios = [
      {
        title: "Conflicting Priorities",
        situation: `You are discussing ${topic} with someone who has a different priority. You need a practical agreement today.`,
        discuss: ["What is your non-negotiable point?", "What compromise would still be acceptable?", "How will you close the conversation clearly?"]
      },
      {
        title: "Owning a Mistake",
        situation: `You need to explain a mistake related to ${topic} and propose a realistic recovery plan.`,
        discuss: ["How do you acknowledge responsibility clearly?", "What exact next steps do you propose?", "How do you rebuild trust?"]
      },
      {
        title: "Difficult Meeting",
        situation: `In a short meeting about ${topic}, another person strongly disagrees with your approach.`,
        discuss: ["How do you respond without escalating conflict?", "What evidence supports your proposal?", "What middle-ground option can you offer?"]
      },
      {
        title: "Customer Tension",
        situation: `A customer is frustrated about a decision linked to ${topic}. You must keep the relationship constructive.`,
        discuss: ["How do you show empathy without overpromising?", "What solution can you realistically offer now?", "How do you set expectations for follow-up?"]
      },
      {
        title: "Team Disagreement",
        situation: `Two coworkers disagree about how to handle ${topic}, and you are asked to mediate.`,
        discuss: ["What key concern does each side have?", "How do you reframe the conflict around shared goals?", "What decision rule should the team use?"]
      },
      {
        title: "High-Stakes Decision",
        situation: `A last-minute decision about ${topic} could affect results significantly. You have limited time to persuade others.`,
        discuss: ["What is your strongest argument?", "What risk must the group consider?", "How do you recommend deciding now?"]
      }
    ];
    return {
      title: "Roleplay Situations",
      objective: "",
      estimatedDuration: `${requestedScenarios} scenarios`,
      vocabulary: [],
      studentSheet: {
        topic: "",
        levelLabel: "",
        statusLabel: "",
        skillLabel: "",
        vocabulary: [],
        usefulPhrases: [],
        speakingQuestions: [],
        roleplayScenarios: baseScenarios.slice(0, requestedScenarios)
      }
    };
  }

  if (input.materialType === "Speaking questions" && ((input.mode || "Conversational") === "Conversational" || input.mode === "Business")) {
    const durationMinutes = Number.parseInt(input.duration, 10) || 45;
    const isProfessional = input.student.goals.join(" ").toLowerCase().includes("work") || input.student.interests.join(" ").toLowerCase().includes("business");
    const ranges =
      durationMinutes <= 15
        ? { vocabMin: 4, vocabMax: 5, qMin: 4, qMax: 5 }
        : durationMinutes <= 30
          ? { vocabMin: 5, vocabMax: 7, qMin: 6, qMax: 8 }
          : durationMinutes <= 45
            ? { vocabMin: 6, vocabMax: 8, qMin: 8, qMax: 10 }
            : { vocabMin: 8, vocabMax: 10, qMin: 10, qMax: 12 };
    const vocabTarget = Math.min(ranges.vocabMax, Math.max(ranges.vocabMin, durationMinutes <= 15 ? 4 : durationMinutes <= 30 ? 6 : durationMinutes <= 45 ? 7 : 9));
    const questionTarget = Math.min(ranges.qMax, Math.max(ranges.qMin, durationMinutes <= 15 ? 4 : durationMinutes <= 30 ? 7 : durationMinutes <= 45 ? 9 : 11));

    const vocabPool = vocabulary.length
      ? vocabulary
      : ["clarify", "follow up", "trade-off", "constraint", "priority", "outcome", "handover", "alignment", "stakeholder", "timeline", "bottleneck", "feasible", "scope", "friction"];
    const sheetVocabulary = vocabPool.slice(0, vocabTarget);
    const easierBase = [
      `How often do you deal with ${topic} in your daily life?`,
      `What is one good and one difficult part of ${topic} for you?`,
      `What usually makes ${topic} easier for you?`,
      `Can you describe a simple example from your week about ${topic}?`,
      `What part of this topic do you feel most confident about?`,
      `What do you still find unclear about ${topic}?`
    ];
    const mainBase = [
      `Tell me about a recent real situation related to ${topic}. What happened?`,
      `What choices did you have, and why did you choose that option?`,
      `If you could repeat that situation, what would you change?`,
      `What trade-off did you make, and was it worth it?`,
      `How did other people react to your approach?`,
      `What was the most useful language you needed in that moment?`,
      `What would a stronger version of your response sound like?`
    ];
    const deeperBase = [
      `How might your approach to ${topic} evolve in the next year?`,
      `What advice would you give someone at a lower level about handling ${topic}?`,
      `Where could misunderstandings happen, and how would you prevent them?`,
      `What are the long-term consequences of weak communication in this area?`,
      `How would your answer change if the stakes were much higher?`,
      `What assumptions do people make about this topic that you disagree with?`
    ];

    let easyShare = 0.35;
    let mainShare = 0.4;
    let deepShare = 0.25;
    if (input.level === "A2" || input.level === "B1") {
      easyShare = 0.45;
      mainShare = 0.4;
      deepShare = 0.15;
    } else if (input.level === "C1") {
      easyShare = 0.2;
      mainShare = isProfessional ? 0.35 : 0.4;
      deepShare = isProfessional ? 0.45 : 0.4;
    }

    const easyCount = Math.max(1, Math.round(questionTarget * easyShare));
    const mainCount = Math.max(2, Math.round(questionTarget * mainShare));
    const deepCount = Math.max(1, questionTarget - easyCount - mainCount);
    const easier = easierBase.slice(0, Math.min(easyCount, easierBase.length));
    const main = mainBase.slice(0, Math.min(mainCount, mainBase.length));
    const deeper = deeperBase.slice(0, Math.min(deepCount, deeperBase.length));

    return {
      title: "Speaking Questions",
      objective: "",
      estimatedDuration: duration,
      vocabulary: [],
      studentSheet: {
        topic,
        levelLabel: `Level ${input.level}`,
        statusLabel: "Introduced",
        skillLabel: "Speaking",
        vocabulary: sheetVocabulary.map((term) => `${term} → concise practical explanation`),
        usefulPhrases: input.mode === "Business"
          ? ["From a business perspective...", "The key trade-off here is...", "A practical next step would be..."]
          : ["From my point of view...", "What I noticed was...", "A better option might be..."],
        speakingQuestions: [...easier, ...main, ...deeper],
        easierQuestions: easier,
        mainDiscussionQuestions: main,
        deeperDiscussionQuestions: deeper
      }
    };
  }

  if (input.materialType === "Vocabulary sheet") {
    const density = input.vocabularyDensity || duration;
    const target = density === "Short" ? 18 : density === "Rich" ? 34 : 28;
    const pool = (vocabulary.length ? vocabulary : ["screen fatigue", "attention span", "doomscrolling", "digital boundary", "constant notifications", "mental bandwidth", "focus drift", "content overload", "algorithmic feed", "work-life blur", "attention economy", "digital detox", "compulsive checking", "online boundaries", "notification overload", "habit loop", "mental load", "algorithmic pressure", "screen-time limits", "focus recovery", "work-life blur", "social comparison", "dopamine hit", "healthy friction", "offline time", "content feed", "mindless scrolling", "tech dependency", "behavioural trigger", "digital wellbeing", "attention reset", "personal boundary", "social pressure", "constant availability"]).slice(0, target);
    const sections = [
      { title: "Key Concepts", items: pool.slice(0, 7) },
      { title: "Topic-Specific Language", items: pool.slice(7, 14) },
      { title: "Professional & Social Context", items: pool.slice(14, 21) },
      { title: "Advanced Expressions", items: pool.slice(21, 28) }
    ].filter((section) => section.items.length > 0);
    return {
      title: topic,
      objective: "",
      estimatedDuration: density,
      vocabulary: pool.map((term) => ({ term, task: `Practical meaning in context of ${topic}.` })),
      studentSheet: {
        topic,
        levelLabel: `Level ${input.level}`,
        statusLabel: "Introduced",
        skillLabel: "Vocabulary",
        vocabulary: [],
        usefulPhrases: [
          "What stands out to me is...",
          "A more balanced way to see this is...",
          "In practical terms, this means...",
          "From a professional point of view..."
        ],
        speakingQuestions: [],
        vocabularySections: sections.map((section) => ({
          title: section.title,
          items: section.items.map((term) => `${term} → concise practical explanation`)
        }))
      }
    };
  }

  if (input.materialType === "Quiz") {
    const isAdvanced = input.level === "C1";
    const totalQuestions = parseCount(input.quizQuestionCount || duration, 10);
    const quizType = input.quizType || "Mixed review";
    const counts =
      quizType === "Multiple choice"
        ? { quick: totalQuestions, gap: 0, explain: 0, speak: 0 }
        : quizType === "Gap fill"
          ? { quick: 0, gap: totalQuestions, explain: 0, speak: 0 }
          : quizType === "Speaking review"
            ? { quick: 0, gap: 0, explain: Math.max(2, Math.round(totalQuestions * 0.4) + (isAdvanced ? 1 : 0)), speak: Math.max(2, Math.round(totalQuestions * 0.6)) }
            : {
                quick: Math.max(1, Math.round(totalQuestions * 0.3)),
                gap: Math.max(1, Math.round(totalQuestions * 0.3)),
                explain: Math.max(1, Math.round(totalQuestions * 0.2) + (isAdvanced ? 1 : 0)),
                speak: Math.max(1, Math.round(totalQuestions * 0.2))
              };
    const quickPool = [
      `Which option best matches the idea of "${input.student.vocabularyToReview[0] || "trade-off"}" in this topic?`,
      `Choose the most natural phrase to respond in a discussion about ${topic}.`,
      `Pick the sentence with the most appropriate register for this context.`,
      `Choose the best connector to complete this argument naturally.`,
      `Identify the response that keeps the discussion constructive.`
    ];
    const gapPool = [
      `One major challenge in ${topic} is ______ because ______.`,
      `A practical solution for this situation would be ______.`,
      `In this context, a better way to phrase my opinion is ______.`,
      `A likely misunderstanding here is ______, so I would clarify ______.`,
      `If priorities conflict, the most realistic compromise is ______.`
    ];
    const explainPool = [
      `Explain the difference between a short-term and long-term decision in ${topic}.`,
      `Describe one real example where communication quality changed the outcome.`,
      `Explain why people often disagree about this issue even with similar goals.`,
      `Describe a situation where tone matters more than vocabulary choice.`,
      `Explain one trade-off someone should consider before making a decision.`
    ];
    const speakingPool = [
      `Defend one opinion about ${topic} and support it with one example.`,
      `Respond to a disagreement politely and keep the conversation productive.`,
      `Compare two approaches and argue which one is more practical.`,
      `Give a short recommendation and justify it under time pressure.`,
      `Handle a pushback response and keep your position clear.`
    ];
    return {
      title: `🧪 ${topic} Quiz`,
      objective: "",
      estimatedDuration: `${totalQuestions} questions`,
      vocabulary: [],
      studentSheet: {
        topic,
        levelLabel: `Level ${input.level}`,
        statusLabel: "Introduced",
        skillLabel: "Focus: Vocabulary / Speaking review",
        vocabulary: [],
        usefulPhrases: [],
        speakingQuestions: [],
        quizSections: [
          {
            title: "✅ Quick Check",
            items: quickPool.slice(0, counts.quick)
          },
          {
            title: "✍️ Complete the Sentence",
            items: gapPool.slice(0, counts.gap)
          },
          {
            title: "🗣️ Explain in Your Own Words",
            items: explainPool.slice(0, counts.explain)
          },
          {
            title: "💬 Mini Speaking Challenge",
            items: speakingPool.slice(0, counts.speak)
          }
        ]
      }
    };
  }

  if (input.materialType === "Listening activity") {
    const exerciseType = input.listeningExerciseType || "Both";
    const length = input.listeningLength || "Standard";
    const itemCount = length === "Short" ? 4 : length === "Extended" ? 8 : 6;
    const requestedGaps = parseCount(input.numberOfGaps || "", 10);
    const gapBank = buildListeningGapBank(topic, input.student, input.gapFillFocus || "Topic Vocabulary", input.level).slice(0, requestedGaps);
    const keyVocabulary = buildListeningKeyVocabulary(topic, input.student, input.level);
    const usefulExpressions = buildListeningUsefulExpressions(topic, input.level);
    const trueFalseItems = buildListeningTrueFalseItems(topic, input.level);
    const discussionItems = buildListeningDiscussionItems(topic, input.level, keyVocabulary, usefulExpressions);
    const transcript =
      input.transcript ||
      `This short listening text discusses ${topic}. The speaker explains a common problem, gives a practical example, and suggests a balanced response. The main idea is that people need clear habits, realistic expectations, and better communication.`;
    const includeTrueFalse = exerciseType === "True/False" || exerciseType === "Both";
    const includeGapFill = exerciseType === "Gap Fill" || exerciseType === "Both";
    return {
      title: "Listening Activity",
      objective: "",
      estimatedDuration: length,
      vocabulary: [],
      studentSheet: {
        topic,
        levelLabel: `Level ${input.level}`,
        statusLabel: "Introduced",
        skillLabel: "Listening",
        vocabulary: [],
        usefulPhrases: [],
        speakingQuestions: [],
        transcript,
        listeningExercises: [
          ...(includeTrueFalse
            ? [
                {
                  title: "✅ True / False",
                  items: trueFalseItems.slice(0, itemCount)
                }
              ]
            : []),
          ...(includeGapFill
            ? [
                {
                  title: "✍️ Gap Fill",
                  items: gapBank.map((term, index) => buildMockGapSentence(term, topic, index))
                }
              ]
            : [])
        ],
        wordBank: includeGapFill ? gapBank : [],
        followUpDiscussion: discussionItems,
        optionalVocabulary: [
          {
            title: "Key Vocabulary",
            items: keyVocabulary
          },
          {
            title: "Useful Expressions",
            items: usefulExpressions
          }
        ]
      }
    };
  }

  return {
    title: `${input.materialType}: ${topic}`,
    objective: `${input.student.name} practices ${input.skillFocus.toLowerCase()} naturally through a ${input.mode || "Conversational"} flow.`,
    estimatedDuration: duration,
    teacherInstructions: [],
    studentInstructions: [],
    activitySteps: [],
    activities: [],
    vocabulary: (vocabulary.length > 0 ? vocabulary : ["clarify", "respond", "support", "summarize"]).map((term) => ({
      term,
      task: `Use "${term}" in one sentence connected to ${topic}.`
    })),
    followUpQuestions: [],
    vocabularyFocus: vocabulary,
    speakingPrompts: [
      `Tell me about a recent situation connected to ${topic}.`,
      `What would you do differently next time?`
    ],
    correctionsFocus: mistakes.length ? mistakes : [input.student.grammarWeaknesses[0] || "accuracy in longer turns"],
    homeworkSuggestion: "",
    studentSheet: {
      topic,
      vocabulary: vocabulary.length ? vocabulary : ["clarify", "respond", "summarize"],
      usefulPhrases: [
        "From my perspective...",
        "What I mean is...",
        "Could you clarify what you mean by...?"
      ],
      speakingQuestions: [
        `What is your current take on ${topic}?`,
        `Can you share a recent example connected to ${topic}?`,
        `What would you do differently next time?`
      ],
      deeperDiscussionQuestion: `How could this topic affect your ${input.student.goals[0] || "real-life communication"} over the next few months?`
    },
    teacherNotes: {
      correctionFocus: mistakes.length ? mistakes : [input.student.grammarWeaknesses[0] || "sentence accuracy"],
      followUpIdeas: [
        `Ask for a contrasting example to the student's first answer.`,
        `Prompt a quick reformulation with better linking language.`
      ],
      conversationExpansion: [
        `Shift from personal experience to opinion and reasoning.`,
        `Move into a mini role-switch where the student gives advice.`
      ],
      possibleIssues: [
        input.student.pronunciationNotes[0] || "word stress drift in longer turns",
        input.student.grammarWeaknesses[0] || "tense consistency"
      ]
    }
  };
}

function parseCount(value: string, fallback: number) {
  const count = Number.parseInt(value, 10);
  return Number.isFinite(count) && count > 0 ? count : fallback;
}

function buildListeningGapBank(topic: string, student: TeachingStudent, focus: GapFillFocus, level: CefrLevel) {
  const topicTerms = [
    `${topic} habits`,
    `${topic} challenge`,
    "practical example",
    "balanced response",
    "long-term impact",
    "everyday choices",
    "clear boundary",
    "main concern",
    "realistic expectation",
    "positive outcome"
  ];
  const generalTerms = getListeningLevelVocabulary(level);
  const expressionTerms = getListeningLevelExpressions(level);
  const memoryTerms = student.vocabularyToReview.filter(Boolean);

  if (focus === "Topic Vocabulary") return dedupe([...memoryTerms, ...topicTerms, ...expressionTerms, ...generalTerms]);
  if (focus === "General Vocabulary") return dedupe([...memoryTerms, ...generalTerms, ...topicTerms, ...expressionTerms]);
  if (focus === "Expressions & Phrases") return dedupe([...memoryTerms, ...expressionTerms, ...topicTerms, ...generalTerms]);
  return dedupe([...memoryTerms, ...topicTerms.slice(0, 4), ...expressionTerms.slice(0, 4), ...generalTerms]);
}

function buildListeningKeyVocabulary(topic: string, student: TeachingStudent, level: CefrLevel) {
  const memoryItems = student.vocabularyToReview.slice(0, 3).map((item) => `${item} → Review word from this student's memory. Example: Try to use ${item} when discussing ${topic}.`);
  const b1 = [
    `challenge → a problem that is difficult but possible to manage. Example: Remote work can be a challenge for new teams.`,
    `habit → something you do regularly. Example: Checking messages every hour can become a habit.`,
    `choice → a decision between two or more options. Example: Employees have a choice about where they work.`,
    `focus → attention on one thing. Example: Some people focus better at home.`,
    `feedback → advice or comments to help improve. Example: Quick feedback helps people understand their mistakes.`,
    `trust → belief that someone is honest or reliable. Example: Managers need trust when teams work remotely.`,
    `problem → something that needs a solution. Example: Poor communication is a common problem.`,
    `improve → to make something better. Example: Clear rules can improve teamwork.`
  ];
  const b2 = [
    `team culture → the shared habits and values of a team. Example: Remote work can affect team culture over time.`,
    `workplace expectation → what people normally expect at work. Example: Fast replies may become a workplace expectation.`,
    `communication gap → a missing or unclear exchange of information. Example: Remote teams need to avoid communication gaps.`,
    `accountability → responsibility for your work or decisions. Example: Accountability matters when managers cannot see daily work.`,
    `productivity → how much useful work someone does. Example: Some employees say remote work increases productivity.`,
    `collaboration → working together with other people. Example: Good tools can support online collaboration.`,
    `trade-off → a balance where you gain one thing but lose another. Example: Remote work creates a trade-off between flexibility and connection.`,
    `long-term impact → the effect something has over time. Example: Team culture may have a long-term impact on performance.`
  ];
  const c1 = [
    `underlying tension → a hidden conflict between two ideas. Example: The underlying tension is between autonomy and control.`,
    `organizational culture → the values and behaviors that shape a company. Example: Remote work can reshape organizational culture.`,
    `implicit assumption → an idea that is suggested but not said directly. Example: The speaker makes an implicit assumption about trust.`,
    `team cohesion → how united and connected a team feels. Example: Informal conversations can strengthen team cohesion.`,
    `autonomy → the ability to make your own decisions. Example: Remote workers often value autonomy.`,
    `nuanced perspective → a view that considers complexity. Example: The speaker gives a nuanced perspective on remote work.`,
    `strategic trade-off → an important balance between competing priorities. Example: Leaders face a strategic trade-off between flexibility and supervision.`,
    `discourse marker → a phrase that organizes ideas in speech. Example: However is a discourse marker that signals contrast.`
  ];
  const levelItems = level === "A1" || level === "A2" || level === "B1" ? b1 : level === "B2" ? b2 : c1;
  return dedupe([...memoryItems, ...levelItems]).slice(0, 15);
}

function buildListeningUsefulExpressions(topic: string, level: CefrLevel) {
  const b1 = [
    `keep up with → to continue at the same speed or level. Example: It can be hard to keep up with messages.`,
    `work from home → to do your job at home. Example: Many people work from home two days a week.`,
    `talk through → to discuss something carefully. Example: Teams should talk through problems early.`,
    `make a change → to do something differently. Example: The company decided to make a change.`
  ];
  const b2 = [
    `take responsibility for → to accept that you should manage or fix something. Example: Employees need to take responsibility for clear communication.`,
    `set clear boundaries → to create limits that people understand. Example: Remote workers should set clear boundaries after work.`,
    `find a balance between → to manage two competing needs. Example: Teams need to find a balance between flexibility and connection.`,
    `keep people in the loop → to make sure others have the information they need. Example: Managers should keep people in the loop.`
  ];
  const c1 = [
    `draw a distinction between → to show how two ideas are different. Example: The speaker draws a distinction between flexibility and isolation.`,
    `raise a broader question → to introduce a larger issue. Example: Remote work raises a broader question about trust.`,
    `take a nuanced view → to avoid a simple yes/no opinion. Example: The speaker takes a nuanced view of ${topic}.`,
    `weigh competing priorities → to compare important but conflicting needs. Example: Leaders must weigh competing priorities.`
  ];
  if (level === "A1" || level === "A2" || level === "B1") return b1;
  if (level === "B2") return b2;
  return c1;
}

function getListeningLevelVocabulary(level: CefrLevel) {
  if (level === "A1" || level === "A2") {
    return ["daily routine", "important problem", "simple reason", "useful idea", "personal choice", "clear example", "better habit", "common situation", "main point", "small change"];
  }
  if (level === "B1") {
    return ["main point", "common problem", "practical reason", "clear example", "personal choice", "useful habit", "simple solution", "everyday situation", "important change", "positive result"];
  }
  if (level === "B2") {
    return ["underlying issue", "practical approach", "personal responsibility", "clear expectation", "meaningful change", "possible consequence", "shared concern", "balanced solution", "workplace pressure", "long-term habit"];
  }
  return ["implicit assumption", "broader implication", "nuanced perspective", "underlying tension", "long-term consequence", "competing priority", "strategic trade-off", "discourse marker", "professional expectation", "subtle distinction"];
}

function getListeningLevelExpressions(level: CefrLevel) {
  if (level === "A1" || level === "A2" || level === "B1") {
    return ["deal with", "make a change", "find it difficult to", "talk about", "think about", "lead to", "pay attention to", "in daily life", "for example", "a good way to"];
  }
  if (level === "B2") {
    return ["set clear boundaries", "make a difference", "take responsibility for", "on a regular basis", "come up with", "weigh the benefits", "handle pressure", "reach a compromise", "lead to", "in the long run"];
  }
  return ["frame the issue as", "draw a distinction between", "raise a broader question", "take a nuanced view", "challenge the assumption that", "shed light on", "weigh competing priorities", "signal hesitation", "build a stronger case", "in practical terms"];
}

function buildListeningTrueFalseItems(topic: string, level: CefrLevel) {
  if (level === "A1" || level === "A2" || level === "B1") {
    return [
      `The speaker talks about ${topic}.`,
      "The speaker gives a clear example.",
      "The speaker says the problem has no solution.",
      "The speaker mentions everyday choices.",
      "The speaker says communication can help.",
      "The speaker gives one practical recommendation.",
      "The speaker says habits can affect the result.",
      "The speaker says the topic is not important."
    ];
  }
  if (level === "B2") {
    return [
      `The speaker suggests that ${topic} involves both personal choices and external pressure.`,
      "The speaker implies that communication can reduce misunderstandings.",
      "The example shows a cause-and-effect relationship.",
      "The speaker presents the solution as quick and effortless.",
      "The speaker contrasts short-term habits with longer-term consequences.",
      "The speaker's attitude is balanced rather than extreme.",
      "The speaker connects the topic to workplace or social expectations.",
      "The speaker avoids giving any practical recommendation."
    ];
  }
  return [
    `The speaker frames ${topic} as a question of competing priorities rather than a simple personal failure.`,
    "The speaker's argument depends partly on an unstated assumption about responsibility.",
    "The speaker uses contrast to show why a simple solution may be unrealistic.",
    "The speaker dismisses the social dimension of the issue completely.",
    "The speaker's recommendation is cautious rather than absolute.",
    "The example reveals a tension between convenience and long-term impact.",
    "The speaker uses nuanced language to avoid overgeneralizing.",
    "The speaker argues that individual habits are irrelevant."
  ];
}

function buildListeningDiscussionItems(topic: string, level: CefrLevel, keyVocabulary: string[], usefulExpressions: string[]) {
  const firstWord = extractTerm(keyVocabulary[0] || "challenge");
  const firstExpression = extractTerm(usefulExpressions[0] || "keep up with");
  if (level === "A1" || level === "A2" || level === "B1") {
    return [
      `Which part of the transcript about ${topic} was easiest to understand?`,
      `What example from the transcript connects to "${firstWord}"?`,
      `Can you answer using the expression "${firstExpression}"?`,
      "Do you agree with the speaker's main idea? Why?"
    ];
  }
  if (level === "B2") {
    return [
      `What trade-off does the speaker suggest in relation to ${topic}?`,
      `How could the idea of "${firstWord}" apply in a workplace or study situation?`,
      `Try to use "${firstExpression}" when explaining your answer.`,
      "Which part of the argument would you challenge, and why?",
      "What consequence does the speaker seem most concerned about?"
    ];
  }
  return [
    `What implicit assumption does the speaker make about ${topic}?`,
    `How does the concept of "${firstWord}" shape the listener's interpretation?`,
    `Can you develop your answer using "${firstExpression}" naturally?`,
    "Where does the argument feel nuanced, and where does it feel oversimplified?",
    "What broader social or professional implication could be developed from this transcript?"
  ];
}

function extractTerm(item: string) {
  return item.split("→")[0]?.trim() || item;
}

function buildMockGapSentence(_term: string, topic: string, index: number) {
  const templates = [
    `The speaker presents ______ as one of the main ideas connected to ${topic}.`,
    "A useful way to understand the situation is to look at the ______ behind it.",
    "The example shows why a ______ can change how people respond.",
    `In the transcript, ______ is connected to everyday decisions about ${topic}.`,
    "The speaker suggests that a ______ may lead to better communication.",
    "One important phrase from the listening is ______, because it helps explain the speaker's point.",
    `The discussion of ${topic} becomes clearer when we notice the role of ______.`,
    "The speaker uses ______ to describe a practical response to the problem."
  ];
  return templates[index % templates.length].replace("______", "______");
}

function dedupe(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

export function materialToPlainText(content: GeneratedMaterialContent) {
  if (content.studentSheet?.transcript || content.studentSheet?.listeningExercises?.length) {
    return [
      "# 🎧 Listening Activity",
      "",
      content.studentSheet?.topic ? `Topic: ${content.studentSheet.topic}` : "",
      content.estimatedDuration ? `Duration: ${content.estimatedDuration}` : "",
      "",
      "## Transcript",
      content.studentSheet?.transcript || "",
      "",
      "## Listening exercises",
      ...(content.studentSheet?.listeningExercises || []).flatMap((section) => [
        section.title,
        ...section.items.map((item) => `- ${item}`),
        ""
      ]),
      ...(content.studentSheet?.wordBank?.length ? ["Word bank:", ...content.studentSheet.wordBank.map((item) => `- ${item}`), ""] : []),
      "## Follow-up discussion",
      ...(content.studentSheet?.followUpDiscussion || []).map((item) => `- ${item}`),
      "",
      ...(content.studentSheet?.optionalVocabulary?.length
        ? [
            "## Optional vocabulary",
            ...content.studentSheet.optionalVocabulary.flatMap((section) => [
              section.title,
              ...section.items.map((item) => `- ${item}`),
              ""
            ])
          ]
        : [])
    ].join("\n");
  }

  if (content.studentSheet?.roleplayScenarios?.length) {
    return [
      "# 🎭 Roleplay Scenarios",
      "",
      ...content.studentSheet.roleplayScenarios.flatMap((scenario) => [
        `## ${scenario.title}`,
        "",
        scenario.situation,
        "",
        "### Discuss:",
        ...scenario.discuss.map((prompt) => `- ${prompt}`),
        ""
      ])
    ].join("\n");
  }

  if (content.studentSheet && !content.teacherNotes && !(content.teacherInstructions?.length || 0) && !(content.activitySteps?.length || 0)) {
    return [
      "# 🗣️ Speaking Questions",
      "",
      "",
      "## 🟢 B1 Level / Easier Questions",
      ...(content.studentSheet.easierQuestions || []).map((item) => `- ${item}`),
      "",
      "## 🔵 B2 Level / Professional Discussion",
      ...(content.studentSheet.mainDiscussionQuestions || []).map((item) => `- ${item}`),
      "",
      "## 🔴 C1 Level / Advanced Discussion",
      ...(content.studentSheet.deeperDiscussionQuestions || []).map((item) => `- ${item}`)
    ]
      .join("\n");
  }

  const teacherInstructions = content.teacherInstructions || [];
  const studentInstructions = content.studentInstructions || [];
  const activitySteps = content.activitySteps || [];
  const followUpQuestions = content.followUpQuestions || [];

  return [
    content.title,
    "",
    `Objective: ${content.objective}`,
    content.estimatedDuration ? `Estimated duration: ${content.estimatedDuration}` : "",
    "",
    "Teacher instructions:",
    ...teacherInstructions.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Student instructions:",
    ...studentInstructions.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Activity steps:",
    ...activitySteps.map((item, index) => `${index + 1}. ${item}`),
    "",
    ...(content.speakingPrompts?.length ? ["Speaking prompts:", ...content.speakingPrompts.map((item, index) => `${index + 1}. ${item}`), ""] : []),
    ...(content.correctionsFocus?.length ? ["Corrections focus:", ...content.correctionsFocus.map((item) => `- ${item}`), ""] : []),
    "",
    "Vocabulary:",
    ...content.vocabulary.map((item) => `- ${item.term}: ${item.task}`),
    "",
    "Follow-up questions:",
    ...followUpQuestions.map((item, index) => `${index + 1}. ${item}`),
    "",
    ...(content.studentSheet
      ? [
          "Student Sheet:",
          `Topic: ${content.studentSheet.topic}`,
          "Vocabulary:",
          ...content.studentSheet.vocabulary.map((item) => `- ${item}`),
          "Useful phrases:",
          ...content.studentSheet.usefulPhrases.map((item) => `- ${item}`),
          "Speaking questions:",
          ...content.studentSheet.speakingQuestions.map((item, index) => `${index + 1}. ${item}`),
          content.studentSheet.deeperDiscussionQuestion ? `Deeper question: ${content.studentSheet.deeperDiscussionQuestion}` : "",
          ""
        ]
      : []),
    ...(content.teacherNotes
      ? [
          "Teacher Notes:",
          "Correction focus:",
          ...content.teacherNotes.correctionFocus.map((item) => `- ${item}`),
          "Follow-up ideas:",
          ...content.teacherNotes.followUpIdeas.map((item) => `- ${item}`)
        ]
      : [])
  ].join("\n");
}
