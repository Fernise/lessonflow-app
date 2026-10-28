import type { CefrLevel } from "@/lib/types";
import type { GeneratedMaterialContent, MaterialMetadata, MaterialSkill, MaterialType } from "@/lib/teaching-types";

type ExtractMaterialMetadataInput = {
  title: string;
  topic: string;
  level: CefrLevel;
  materialType: MaterialType | string;
  skillFocus?: string;
  content?: GeneratedMaterialContent;
};

const skillNames: MaterialSkill[] = ["Speaking", "Listening", "Vocabulary", "Reading", "Grammar"];
const stopWords = new Set([
  "about",
  "activity",
  "because",
  "could",
  "discussion",
  "english",
  "example",
  "from",
  "have",
  "into",
  "lesson",
  "material",
  "questions",
  "should",
  "their",
  "there",
  "this",
  "through",
  "with",
  "work"
]);

export function extractMaterialMetadata(input: ExtractMaterialMetadataInput): MaterialMetadata {
  const content = input.content;
  const topic = cleanLabel(input.topic || content?.studentSheet?.topic || input.title || "Untitled topic");
  const materialType = cleanLabel(input.materialType || "Material");
  const studentSheet = content?.studentSheet;
  const vocabularySections = safeArray(studentSheet?.vocabularySections);
  const optionalVocabulary = safeArray(studentSheet?.optionalVocabulary);
  const quizSections = safeArray(studentSheet?.quizSections);
  const listeningExercises = safeArray(studentSheet?.listeningExercises);
  const roleplayScenarios = safeArray(studentSheet?.roleplayScenarios);

  if (process.env.NODE_ENV === "development") {
    logArrayState("material-intelligence.vocabularySections", studentSheet?.vocabularySections);
    logArrayState("material-intelligence.optionalVocabulary", studentSheet?.optionalVocabulary);
    logArrayState("material-intelligence.quizSections", studentSheet?.quizSections);
    logArrayState("material-intelligence.listeningExercises", studentSheet?.listeningExercises);
    logArrayState("material-intelligence.roleplayScenarios", studentSheet?.roleplayScenarios);
  }

  const textParts = [
    input.title,
    topic,
    input.skillFocus,
    materialType,
    content?.title,
    content?.objective,
    studentSheet?.topic,
    ...safeStringArray(studentSheet?.vocabulary),
    ...safeStringArray(studentSheet?.usefulPhrases),
    ...safeStringArray(studentSheet?.speakingQuestions),
    ...safeStringArray(studentSheet?.easierQuestions),
    ...safeStringArray(studentSheet?.mainDiscussionQuestions),
    ...safeStringArray(studentSheet?.deeperDiscussionQuestions),
    ...safeStringArray(studentSheet?.followUpDiscussion),
    ...safeStringArray(studentSheet?.wordBank),
    ...vocabularySections.flatMap((section) => [getSectionTitle(section), ...getSectionItems(section)]),
    ...optionalVocabulary.flatMap((section) => [getSectionTitle(section), ...getSectionItems(section)]),
    ...quizSections.flatMap((section) => [getSectionTitle(section), ...getSectionItems(section)]),
    ...listeningExercises.flatMap((section) => [getSectionTitle(section), ...getSectionItems(section)]),
    ...roleplayScenarios.flatMap((scenario) => [getScenarioTitle(scenario), getScenarioSituation(scenario), ...getScenarioDiscuss(scenario)])
  ].filter(Boolean) as string[];

  const skills = inferSkills(materialType, input.skillFocus || "", textParts.join(" "));
  const keywords = unique([
    ...splitTopic(topic),
    ...extractKeywords(textParts.join(" "))
  ]).slice(0, 16);
  const vocabularyThemes = inferVocabularyThemes(content, topic, keywords).slice(0, 10);

  return {
    topic,
    subtopic: inferSubtopic(topic, keywords, vocabularyThemes),
    level: input.level,
    skills,
    materialType,
    keywords,
    vocabularyThemes
  };
}

export function getMaterialSearchText(metadata?: MaterialMetadata) {
  if (!metadata) return "";
  return [
    metadata.topic,
    metadata.subtopic,
    metadata.level,
    metadata.materialType,
    ...safeStringArray(metadata.skills),
    ...safeStringArray(metadata.keywords),
    ...safeStringArray(metadata.vocabularyThemes)
  ].join(" ");
}

export function getPrimarySkillLabel(metadata?: MaterialMetadata, fallback = "") {
  return safeStringArray(metadata?.skills)[0] || fallback || "General";
}

function inferSkills(materialType: string, skillFocus: string, text: string): MaterialSkill[] {
  const haystack = `${materialType} ${skillFocus} ${text}`.toLowerCase();
  const skills = skillNames.filter((skill) => haystack.includes(skill.toLowerCase()));
  if (haystack.includes("roleplay") || haystack.includes("debate") || haystack.includes("conversation")) skills.push("Speaking");
  if (haystack.includes("quiz") || haystack.includes("gap fill")) skills.push("Vocabulary");
  if (haystack.includes("transcript") || haystack.includes("true / false")) skills.push("Listening");
  return unique(skills).slice(0, 5);
}

function inferVocabularyThemes(content: GeneratedMaterialContent | undefined, topic: string, keywords: string[]) {
  const studentSheet = content?.studentSheet;
  const sectionTitles = [
    ...safeArray(studentSheet?.vocabularySections).map(getSectionTitle),
    ...safeArray(studentSheet?.optionalVocabulary).map(getSectionTitle)
  ];
  return unique([
    ...sectionTitles.map(cleanLabel),
    ...splitTopic(topic),
    ...keywords.slice(0, 5)
  ]).filter((item) => item.length > 2);
}

function inferSubtopic(topic: string, keywords: string[], themes: string[]) {
  const candidate = themes.find((theme) => normalize(theme) !== normalize(topic)) || keywords.find((keyword) => !normalize(topic).includes(normalize(keyword)));
  return cleanLabel(candidate || topic);
}

function extractKeywords(text: string) {
  const phrases = text
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length > 3 && !stopWords.has(word));
  return unique(phrases);
}

function splitTopic(topic: string) {
  return topic
    .split(/[\s/,&-]+/)
    .map(cleanLabel)
    .filter((item) => item.length > 2);
}

function cleanLabel(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function unique<T extends string>(items: T[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))) as T[];
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function getSectionTitle(section: unknown) {
  return section && typeof section === "object" && "title" in section ? String(section.title || "") : "";
}

function getSectionItems(section: unknown) {
  return section && typeof section === "object" && "items" in section ? safeStringArray(section.items) : [];
}

function getScenarioTitle(scenario: unknown) {
  return scenario && typeof scenario === "object" && "title" in scenario ? String(scenario.title || "") : "";
}

function getScenarioSituation(scenario: unknown) {
  return scenario && typeof scenario === "object" && "situation" in scenario ? String(scenario.situation || "") : "";
}

function getScenarioDiscuss(scenario: unknown) {
  return scenario && typeof scenario === "object" && "discuss" in scenario ? safeStringArray(scenario.discuss) : [];
}

function logArrayState(name: string, value: unknown) {
  if (value == null || !Array.isArray(value)) {
    console.info("[material-intelligence] nullable array guard", {
      variable: name,
      type: typeof value,
      value
    });
  }
}
