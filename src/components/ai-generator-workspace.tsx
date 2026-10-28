"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, CheckSquare2, Clipboard, History, Pencil, RefreshCw, Save, Sparkles, Square, Trash2, X } from "lucide-react";
import { materialToPlainText } from "@/lib/mock-generation";
import { getMaterialGenerationEvent, trackEvent } from "@/lib/analytics";
import { getRecentlyStudiedTopics, getStudentReviewNeeds, getSuggestedNextTopics } from "@/lib/student-memory";
import { cefrLevels, type CefrLevel } from "@/lib/types";
import { AppSelect } from "@/components/ui/app-select";
import { showToast } from "@/components/toast-provider";
import type {
  AiGenerationHistoryItem,
  GapFillFocus,
  GeneratedMaterialContent,
  LessonGenerationMode,
  ListeningExerciseLength,
  ListeningExerciseType,
  MaterialType,
  QuizType,
  RoleplayContext,
  TeachingStudent,
  VocabularyDensity
} from "@/lib/teaching-types";

const teachingFocusOptions = [
  "Fluency",
  "Grammar",
  "Pronunciation",
  "Vocabulary",
  "Business English",
  "Natural expressions",
  "Exam prep",
  "Technical English"
];
const materialTypes: MaterialType[] = [
  "Speaking questions",
  "Vocabulary sheet",
  "Quiz",
  "Roleplay",
  "Listening activity"
];
const durationOptions = ["15 minutes", "30 minutes", "45 minutes", "60 minutes", "90 minutes"];
const modeOptions: LessonGenerationMode[] = ["Conversational", "Business", "Debate", "Exam prep"];
const listeningExerciseTypes: ListeningExerciseType[] = ["True/False", "Gap Fill", "Both"];
const gapFillFocusOptions: GapFillFocus[] = ["Topic Vocabulary", "General Vocabulary", "Expressions & Phrases", "Mixed"];
const numberOfGapsOptions = ["5", "10", "15", "20"];
const vocabularyDensityOptions: VocabularyDensity[] = ["Short", "Standard", "Rich"];
const listeningLengthOptions: ListeningExerciseLength[] = ["Short", "Standard", "Extended"];
const quizTypeOptions: QuizType[] = ["Mixed review", "Multiple choice", "Gap fill", "Speaking review"];
const quizQuestionOptions = ["6 questions", "8 questions", "10 questions", "12 questions", "15 questions"];
const roleplayScenarioOptions = ["1 scenario", "2 scenarios", "3 scenarios", "4 scenarios", "5 scenarios"];
const roleplayContextOptions: RoleplayContext[] = ["Casual", "Business", "Customer", "Interview", "Conflict / negotiation"];

type AiGeneratorWorkspaceProps = {
  students: TeachingStudent[];
  generations: AiGenerationHistoryItem[];
};

export function AiGeneratorWorkspace({ students, generations }: AiGeneratorWorkspaceProps) {
  const searchParams = useSearchParams();
  const initialStudent = searchParams.get("student") || students[0]?.id || "";
  const initialType = normalizeMaterialType(searchParams.get("type"));
  const sourceLessonId = searchParams.get("lesson") || "";
  const sourceTopic = searchParams.get("topic") || "";
  const sourceLevel = searchParams.get("level") as CefrLevel | null;
  const [studentId, setStudentId] = useState(initialStudent);
  const selectedStudent = useMemo(
    () => students.find((student) => student.id === studentId) || students[0],
    [studentId, students]
  );
  const [materialType, setMaterialType] = useState<MaterialType>(initialType);
  const [level, setLevel] = useState<CefrLevel>(normalizeLevel(sourceLevel) || selectedStudent?.level || "B1");
  const [teachingFocus, setTeachingFocus] = useState("Fluency");
  const [topic, setTopic] = useState(sourceTopic || selectedStudent?.preferredTopics[0] || "");
  const [speakingDuration, setSpeakingDuration] = useState("45 minutes");
  const [mode, setMode] = useState<LessonGenerationMode>("Conversational");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [manualTranscript, setManualTranscript] = useState("");
  const [showManualTranscriptFallback, setShowManualTranscriptFallback] = useState(false);
  const [listeningExerciseType, setListeningExerciseType] = useState<ListeningExerciseType>("Both");
  const [gapFillFocus, setGapFillFocus] = useState<GapFillFocus>("Topic Vocabulary");
  const [numberOfGaps, setNumberOfGaps] = useState("10");
  const [vocabularyDensity, setVocabularyDensity] = useState<VocabularyDensity>("Standard");
  const [listeningLength, setListeningLength] = useState<ListeningExerciseLength>("Standard");
  const [quizType, setQuizType] = useState<QuizType>("Mixed review");
  const [quizQuestionCount, setQuizQuestionCount] = useState("10 questions");
  const [roleplayScenarioCount, setRoleplayScenarioCount] = useState("3 scenarios");
  const [roleplayContext, setRoleplayContext] = useState<RoleplayContext>("Casual");
  const [extraInstructions, setExtraInstructions] = useState("");
  const [result, setResult] = useState<GeneratedMaterialContent | null>(null);
  const [generationId, setGenerationId] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [generationWarning, setGenerationWarning] = useState("");
  const [variation, setVariation] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedMaterialId, setSavedMaterialId] = useState("");
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [editingSection, setEditingSection] = useState<{
    id: string;
    title: string;
    value: string;
    helper?: string;
  } | null>(null);

  useEffect(() => {
    setSelectedSectionIds([]);
    setEditingSection(null);
  }, [result]);

  useEffect(() => {
    const nextStudentId = searchParams.get("student");
    const nextType = normalizeMaterialType(searchParams.get("type"));
    const nextTopic = searchParams.get("topic");
    const nextLevel = normalizeLevel(searchParams.get("level") as CefrLevel | null);
    if (nextStudentId && nextStudentId !== studentId) {
      const nextStudent = students.find((student) => student.id === nextStudentId);
      if (nextStudent) {
        setStudentId(nextStudent.id);
        setLevel(nextLevel || nextStudent.level);
      }
    } else if (nextLevel) {
      setLevel(nextLevel);
    }
    setMaterialType(nextType);
    if (nextTopic) setTopic(nextTopic);
    setResult(null);
    setGenerationId("");
    setSavedMaterialId("");
  }, [searchParams, studentId, students]);

  function handleStudentChange(nextStudentId: string) {
    const nextStudent = students.find((student) => student.id === nextStudentId);
    if (!nextStudent) return;
    setStudentId(nextStudent.id);
    setLevel(nextStudent.level);
    setTopic(nextStudent.preferredTopics[0] || nextStudent.nextSuggestedFocus || "");
    setResult(null);
    setGenerationId("");
    setGenerationError("");
  }

  const generationLength = useMemo(() => {
    if (materialType === "Vocabulary sheet") return vocabularyDensity;
    if (materialType === "Listening activity") return listeningLength;
    if (materialType === "Quiz") return quizQuestionCount;
    if (materialType === "Roleplay") return roleplayScenarioCount;
    return speakingDuration;
  }, [listeningLength, materialType, quizQuestionCount, roleplayScenarioCount, speakingDuration, vocabularyDensity]);

  async function generate(regenerate = false) {
    if (!selectedStudent) return;
    if (!topic.trim()) {
      const message = "Please enter a topic.";
      setGenerationError(message);
      showToast({ type: "error", title: "Topic required", description: message });
      return;
    }
    const nextVariation = regenerate || result ? variation + 1 : 1;
    setIsGenerating(true);
    setGenerationError("");
    setGenerationWarning("");
    setCopyState("idle");

    try {
      const response = await fetch("/api/ai/generate-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          materialType,
          level,
          topic,
          skillFocus: teachingFocus,
          teachingFocus,
          duration: generationLength,
          mode,
          youtubeUrl,
          manualTranscript,
          listeningExerciseType,
          gapFillFocus,
          numberOfGaps,
          vocabularyDensity,
          listeningLength,
          quizType,
          quizQuestionCount,
          roleplayScenarioCount,
          roleplayContext,
          extraInstructions,
          variation: nextVariation
        })
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        content?: GeneratedMaterialContent;
        generationId?: string;
        source?: "openai" | "mock";
        warning?: string;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.content) {
        throw new Error(payload.error || "Could not generate material.");
      }

      setResult(payload.content);
      setGenerationId(payload.generationId || "");
      setVariation(nextVariation);
      setGenerationWarning(payload.warning || "");
      setShowManualTranscriptFallback(false);
      showToast({ type: "success", title: "Generation complete", description: `${materialType} is ready to review.` });
      const generationProperties = {
        studentId,
        materialType,
        level,
        duration: generationLength,
        mode,
        listeningExerciseType,
        gapFillFocus,
        numberOfGaps,
        vocabularyDensity,
        listeningLength,
        quizType,
        roleplayScenarioCount,
        roleplayContext,
        hasYouTubeUrl: Boolean(youtubeUrl.trim()),
        variation: nextVariation,
        topicPresent: Boolean(topic.trim())
      };
      trackEvent("material_generated", generationProperties);
      trackEvent(getMaterialGenerationEvent(materialType), generationProperties);
      if (generations.length === 0 && nextVariation === 1) trackEvent("first_material_generated", generationProperties);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not generate material.";
      setGenerationError(message);
      if (materialType === "Listening activity") setShowManualTranscriptFallback(true);
      showToast({ type: "error", title: "Generation failed", description: message });
      trackEvent("generation_error", { studentId, materialType, level, duration: generationLength, mode, topicPresent: Boolean(topic.trim()), hasYouTubeUrl: Boolean(youtubeUrl.trim()) });
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    generate();
  }

  function usePreviousLesson(lessonId: string) {
    const lesson = selectedStudent?.lessonHistory.find((item) => item.id === lessonId);
    if (!lesson) return;
    setTopic(lesson.topic || lesson.title);
    setTeachingFocus(lesson.skillFocus || lesson.focus || "Fluency");
    setExtraInstructions(
      `Generate from previous lesson: ${lesson.title}. Covered: ${lesson.topicsCovered.join(", ") || lesson.topic || "not recorded"}. Homework: ${lesson.homeworkAssigned || "not recorded"}. Notes: ${lesson.notes || "none"}.`
    );
    setResult(null);
    setGenerationId("");
  }

  async function copyMaterial() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(materialToPlainText(result));
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  async function saveMaterial() {
    if (!result) return;
    setIsSaving(true);
    setSaveError("");
    setSavedMaterialId("");
    try {
      const response = await fetch("/api/materials/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          materialType,
          topic,
          level,
          skillFocus: teachingFocus,
          content: result,
          generationId,
          lessonId: sourceLessonId
        })
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; materialId?: string };
      if (!response.ok || !payload.ok || !payload.materialId) {
        throw new Error(payload.error || "Could not save material.");
      }
      setSavedMaterialId(payload.materialId);
      showToast({
        type: "success",
        title: sourceLessonId ? `${materialType} saved and attached` : "Material saved",
        description: sourceLessonId ? "Saved to Materials Library and linked to this lesson." : "Saved to your Materials Library."
      });
      trackEvent("material_saved", {
        studentId,
        materialId: payload.materialId,
        materialType,
        level,
        duration: generationLength,
        topicPresent: Boolean(topic.trim())
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save material.";
      setSaveError(message);
      showToast({ type: "error", title: "Save failed", description: message });
      trackEvent("generation_error", { studentId, materialType, level, duration: generationLength, topicPresent: Boolean(topic.trim()), hasYouTubeUrl: Boolean(youtubeUrl.trim()) });
    } finally {
      setIsSaving(false);
    }
  }

  function toggleSectionSelection(sectionId: string) {
    setSelectedSectionIds((current) => (current.includes(sectionId) ? current.filter((id) => id !== sectionId) : [...current, sectionId]));
  }

  function deleteSelectedSections() {
    if (!result || selectedSectionIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedSectionIds.length} selected section(s)?`)) return;
    deleteSections(selectedSectionIds);
    setSelectedSectionIds([]);
  }

  function deleteSingleSection(sectionId: string) {
    if (!result) return;
    if (!window.confirm("Delete this section?")) return;
    deleteSections([sectionId]);
  }

  function deleteSections(sectionIds: string[]) {
    setResult((current) => {
      if (!current?.studentSheet) return current;
      const sheet = current.studentSheet;
      const next = { ...current, studentSheet: { ...sheet } };

      for (const sectionId of sectionIds) {
        if (sectionId === "speaking-easier") next.studentSheet.easierQuestions = [];
        if (sectionId === "speaking-main") next.studentSheet.mainDiscussionQuestions = [];
        if (sectionId === "speaking-deeper") next.studentSheet.deeperDiscussionQuestions = [];
        if (sectionId === "speaking-fallback") next.studentSheet.speakingQuestions = [];
        if (sectionId === "vocabulary-main") next.studentSheet.vocabulary = [];
        if (sectionId === "vocabulary-phrases") next.studentSheet.usefulPhrases = [];
        if (sectionId.startsWith("vocabulary-section-")) {
          const index = Number(sectionId.replace("vocabulary-section-", ""));
          next.studentSheet.vocabularySections = (next.studentSheet.vocabularySections || []).filter((_, idx) => idx !== index);
        }
        if (sectionId.startsWith("quiz-section-")) {
          const index = Number(sectionId.replace("quiz-section-", ""));
          next.studentSheet.quizSections = (next.studentSheet.quizSections || []).filter((_, idx) => idx !== index);
        }
        if (sectionId.startsWith("roleplay-section-")) {
          const index = Number(sectionId.replace("roleplay-section-", ""));
          next.studentSheet.roleplayScenarios = (next.studentSheet.roleplayScenarios || []).filter((_, idx) => idx !== index);
        }
        if (sectionId === "listening-transcript") next.studentSheet.transcript = "";
        if (sectionId === "listening-word-bank") next.studentSheet.wordBank = [];
        if (sectionId === "listening-follow-up") next.studentSheet.followUpDiscussion = [];
        if (sectionId.startsWith("listening-section-")) {
          const index = Number(sectionId.replace("listening-section-", ""));
          next.studentSheet.listeningExercises = (next.studentSheet.listeningExercises || []).filter((_, idx) => idx !== index);
        }
        if (sectionId.startsWith("listening-vocabulary-")) {
          const index = Number(sectionId.replace("listening-vocabulary-", ""));
          next.studentSheet.optionalVocabulary = (next.studentSheet.optionalVocabulary || []).filter((_, idx) => idx !== index);
        }
      }

      return next;
    });
    showToast({ type: "success", title: "Sections deleted", description: "The preview was updated." });
  }

  function openEditor(sectionId: string, title: string, items: string[], helper?: string) {
    setEditingSection({
      id: sectionId,
      title,
      value: items.join("\n"),
      helper
    });
  }

  function saveSectionEdit() {
    if (!result || !editingSection || !result.studentSheet) return;
    const lines = editingSection.value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    setResult((current) => {
      if (!current?.studentSheet) return current;
      const next = { ...current, studentSheet: { ...current.studentSheet } };
      const id = editingSection.id;

      if (id === "speaking-easier") next.studentSheet.easierQuestions = lines;
      if (id === "speaking-main") next.studentSheet.mainDiscussionQuestions = lines;
      if (id === "speaking-deeper") next.studentSheet.deeperDiscussionQuestions = lines;
      if (id === "speaking-fallback") next.studentSheet.speakingQuestions = lines;
      if (id === "vocabulary-main") next.studentSheet.vocabulary = lines;
      if (id === "vocabulary-phrases") next.studentSheet.usefulPhrases = lines;
      if (id.startsWith("vocabulary-section-")) {
        const index = Number(id.replace("vocabulary-section-", ""));
        next.studentSheet.vocabularySections = (next.studentSheet.vocabularySections || []).map((section, idx) =>
          idx === index ? { ...section, items: lines } : section
        );
      }
      if (id.startsWith("quiz-section-")) {
        const index = Number(id.replace("quiz-section-", ""));
        next.studentSheet.quizSections = (next.studentSheet.quizSections || []).map((section, idx) =>
          idx === index ? { ...section, items: lines } : section
        );
      }
      if (id.startsWith("roleplay-section-")) {
        const index = Number(id.replace("roleplay-section-", ""));
        const [situation, ...discuss] = lines;
        next.studentSheet.roleplayScenarios = (next.studentSheet.roleplayScenarios || []).map((section, idx) =>
          idx === index
            ? {
                ...section,
                situation: situation || section.situation,
                discuss
              }
            : section
        );
      }
      if (id === "listening-transcript") next.studentSheet.transcript = lines.join(" ");
      if (id === "listening-word-bank") next.studentSheet.wordBank = lines;
      if (id === "listening-follow-up") next.studentSheet.followUpDiscussion = lines;
      if (id.startsWith("listening-section-")) {
        const index = Number(id.replace("listening-section-", ""));
        next.studentSheet.listeningExercises = (next.studentSheet.listeningExercises || []).map((section, idx) =>
          idx === index ? { ...section, items: lines } : section
        );
      }
      if (id.startsWith("listening-vocabulary-")) {
        const index = Number(id.replace("listening-vocabulary-", ""));
        next.studentSheet.optionalVocabulary = (next.studentSheet.optionalVocabulary || []).map((section, idx) =>
          idx === index ? { ...section, items: lines } : section
        );
      }

      return next;
    });

    setEditingSection(null);
    showToast({ type: "success", title: "Section updated", description: "Preview updated immediately." });
  }

  const isSimpleConversationSheet = Boolean(result?.studentSheet);
  const isSpeakingOnlyOutput = materialType === "Speaking questions";
  const isRoleplayMaterial = materialType === "Roleplay";
  const isQuizMaterial = materialType === "Quiz";
  const isVocabularyMaterial = materialType === "Vocabulary sheet";
  const isListeningMaterial = materialType === "Listening activity";
  const showsGapFillControls = isListeningMaterial && (listeningExerciseType === "Gap Fill" || listeningExerciseType === "Both");
  const reuseCandidate = useMemo(() => {
    if (!result || !selectedStudent) return null;
    const topicTokens = new Set(topic.toLowerCase().split(/\s+/).filter(Boolean));
    return students
      .filter((student) => student.id !== selectedStudent.id)
      .map((student) => {
        let score = 0;
        if (student.level === level) score += 2;
        const sharedInterests = student.interests.filter((interest) => selectedStudent.interests.includes(interest)).length;
        score += Math.min(sharedInterests, 2);
        if (student.nextSuggestedFocus && topicTokens.has(student.nextSuggestedFocus.toLowerCase())) score += 1;
        if (student.vocabularyToReview.some((item) => result.vocabulary.some((v) => v.term.toLowerCase() === item.toLowerCase()))) score += 1;
        if (teachingFocus.toLowerCase().includes("fluency")) score += 1;
        if (generationLength === "45 minutes" || generationLength === "Standard") score += 1;
        return { student, score };
      })
      .sort((a, b) => b.score - a.score)[0] || null;
  }, [generationLength, level, result, selectedStudent, teachingFocus, students, topic]);

  if (students.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-rose-200 bg-white p-8 text-center shadow-sm">
        <Sparkles className="mx-auto text-[#FF4F7B]" size={34} aria-hidden="true" />
        <h2 className="mt-4 text-xl font-semibold text-[#1F2937]">Add a student first</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          The generator uses saved student profiles and teaching memory. Create a profile or seed sample data from the Students page.
        </p>
        <Link
          href="/students/new"
          className="mt-5 inline-flex rounded-xl bg-[#FF4F7B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69]"
        >
          Add student
        </Link>
      </section>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px,1fr]">
      <div className="space-y-5">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-[#FF4F7B]">AI Generator</p>
            <h2 className="mt-1 text-xl font-semibold text-[#1F2937]">Personalized material brief</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Uses OpenAI with the selected student profile, teaching memory, previous lessons, and vocabulary to review.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <Select label="Student" value={studentId} onChange={handleStudentChange}>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </Select>

            <Select label="Material type" value={materialType} onChange={(value) => setMaterialType(value as MaterialType)}>
              {materialTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <p className="-mt-2 text-xs text-slate-500">Material type decides output format. Start with Speaking questions for the fastest first result.</p>

            {isListeningMaterial ? (
              <section className="rounded-2xl border border-rose-100 bg-[#FFF5F8] p-4">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Video URL</span>
                  <input
                    value={youtubeUrl}
                    onChange={(event) => setYoutubeUrl(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm text-[#1F2937] outline-none ring-[#FF4F7B] focus:ring-2"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </label>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  LessonFlow will retrieve and clean the public transcript automatically. No manual transcript input needed.
                </p>
                {showManualTranscriptFallback ? (
                  <label className="mt-4 block">
                    <span className="text-sm font-semibold text-slate-700">Manual transcript fallback</span>
                    <textarea
                      value={manualTranscript}
                      onChange={(event) => setManualTranscript(event.target.value)}
                      className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-rose-100 bg-white px-3 py-2 text-sm leading-6 text-[#1F2937] outline-none ring-[#FF4F7B] focus:ring-2"
                      placeholder="Paste the transcript here if YouTube captions are unavailable..."
                    />
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Use this only when transcript retrieval fails. LessonFlow will clean this text before generating.
                    </p>
                  </label>
                ) : null}
              </section>
            ) : null}

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Topic</span>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm text-[#1F2937] outline-none ring-[#FF4F7B] focus:ring-2"
              />
            </label>
            <p className="-mt-2 text-xs text-slate-500">
              {isListeningMaterial
                ? "Required. Topic helps choose relevant gap-fill words and statements aligned with your lesson intention."
                : "Specific topics produce more reusable materials than broad topics."}
            </p>

            <Select label="Level" value={level} onChange={(value) => setLevel(value as CefrLevel)}>
              {cefrLevels.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>

            {isSpeakingOnlyOutput ? (
              <>
                <Select label="Duration" value={speakingDuration} onChange={setSpeakingDuration}>
                  {durationOptions.filter((item) => item !== "90 minutes").map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
                <p className="-mt-2 text-xs text-slate-500">Duration means conversation/class time and controls question density.</p>
                <Select label="Mode/Angle" value={mode} onChange={(value) => setMode(value as LessonGenerationMode)}>
                  {modeOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </>
            ) : null}

            {isVocabularyMaterial ? (
              <>
                <Select label="Vocabulary density" value={vocabularyDensity} onChange={(value) => setVocabularyDensity(value as VocabularyDensity)}>
                  {vocabularyDensityOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
                <p className="-mt-2 text-xs text-slate-500">Short is compact, Standard is reusable, Rich gives deeper topic vocabulary.</p>
              </>
            ) : null}

            {isListeningMaterial ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Select label="Exercise type" value={listeningExerciseType} onChange={(value) => setListeningExerciseType(value as ListeningExerciseType)}>
                    {listeningExerciseTypes.map((item) => (
                      <option key={item} value={item}>
                        {item === "True/False" ? "True / False" : item}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Select label="Exercise length" value={listeningLength} onChange={(value) => setListeningLength(value as ListeningExerciseLength)}>
                    {listeningLengthOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>
                {showsGapFillControls ? (
                  <>
                    <div>
                      <Select label="Gap Fill Focus" value={gapFillFocus} onChange={(value) => setGapFillFocus(value as GapFillFocus)}>
                        {gapFillFocusOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Select label="Number of gaps" value={numberOfGaps} onChange={setNumberOfGaps}>
                        {numberOfGapsOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </>
                ) : null}
                {showsGapFillControls ? (
                  <p className="-mt-1 text-xs text-slate-500 sm:col-span-2">
                    Gaps prioritize meaningful topic vocabulary, level-appropriate words, expressions, and useful content words.
                  </p>
                ) : null}
              </div>
            ) : null}

            {isQuizMaterial ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Quiz type" value={quizType} onChange={(value) => setQuizType(value as QuizType)}>
                  {quizTypeOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
                <Select label="Number of questions" value={quizQuestionCount} onChange={setQuizQuestionCount}>
                  {quizQuestionOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            {isRoleplayMaterial ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Number of scenarios" value={roleplayScenarioCount} onChange={setRoleplayScenarioCount}>
                  {roleplayScenarioOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
                <Select label="Mode/Context" value={roleplayContext} onChange={(value) => setRoleplayContext(value as RoleplayContext)}>
                  {roleplayContextOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            {isSpeakingOnlyOutput ? (
              <Select label="Teaching focus (optional)" value={teachingFocus} onChange={setTeachingFocus}>
                {teachingFocusOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            ) : null}

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Extra instructions</span>
              <textarea
                value={extraInstructions}
                onChange={(event) => setExtraInstructions(event.target.value)}
                className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-rose-100 bg-white px-3 py-2 text-sm leading-6 text-[#1F2937] outline-none ring-[#FF4F7B] focus:ring-2"
                placeholder={isListeningMaterial ? "Optional: mention accent, target vocabulary, or what students should listen for..." : "Add constraints, student mood, material format, correction preference..."}
              />
            </label>
          </div>

          <button
            type="submit"
            data-testid={result ? "regenerate-material" : "generate-material"}
            disabled={isGenerating}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF4F7B] px-4 py-3 font-semibold text-white transition hover:bg-[#E63E69] disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Sparkles size={18} aria-hidden="true" />
            {isGenerating ? (isListeningMaterial ? "Retrieving transcript..." : "Generating with OpenAI...") : result ? "Regenerate" : "Generate"}
          </button>
          {generationError ? (
            <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-700">
              {generationError}
            </p>
          ) : null}
          {generationWarning ? (
            <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
              {generationWarning}
            </p>
          ) : null}
        </form>

        {selectedStudent ? <StudentContextPanel student={selectedStudent} onUsePreviousLesson={usePreviousLesson} /> : null}
        {selectedStudent ? <GenerationHistory generations={generations.filter((item) => item.studentId === selectedStudent.id)} /> : null}
      </div>

      <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
        {result ? (
          <article>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rose-100 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4F7B]">Generated material</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#1F2937]">{result.title}</h2>
                {result.objective ? <p className="mt-2 text-sm leading-6 text-slate-600">{result.objective}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="regenerate-material"
                  onClick={() => generate(true)}
                  disabled={isGenerating}
                  className="flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-[#FF4F7B] transition hover:border-[#FF4F7B]"
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={copyMaterial}
                  className="flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
                >
                  {copyState === "copied" ? <Check size={16} aria-hidden="true" /> : <Clipboard size={16} aria-hidden="true" />}
                  {copyState === "copied" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {result.studentSheet ? (
                <section className="rounded-2xl border border-rose-100 bg-[#FFF5F8] p-5">
                  <header className="border-b border-rose-100 pb-4">
                    <h3 className="text-xl font-semibold text-[#1F2937]">🌐 {result.studentSheet.topic}</h3>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-white px-3 py-1 text-[#FF4F7B]">{level}</span>
                      <span className="rounded-full bg-white px-3 py-1 text-slate-700">{generationLength}</span>
                      <span className="rounded-full bg-white px-3 py-1 text-slate-700">{materialType}</span>
                    </div>
                  </header>
                  <div className="mt-4 space-y-4">
                  {isListeningMaterial ? (
                    <section className="space-y-3">
                      <h4 className="text-base font-semibold text-[#1F2937]">🎧 Listening Activity</h4>
                      {result.studentSheet.transcript ? (
                        <EditableSectionCard
                          title="Transcript"
                          items={[result.studentSheet.transcript]}
                          selectable={false}
                          selected={selectedSectionIds.includes("listening-transcript")}
                          onToggleSelect={() => toggleSectionSelection("listening-transcript")}
                          onEdit={() => openEditor("listening-transcript", "Transcript", [result.studentSheet?.transcript || ""])}
                          onDelete={() => deleteSingleSection("listening-transcript")}
                        />
                      ) : null}
                      {result.studentSheet.optionalVocabulary?.map((section, index) => (
                        <EditableSectionCard
                          key={section.title}
                          title={section.title}
                          items={section.items}
                          selectable={false}
                          selected={selectedSectionIds.includes(`listening-vocabulary-${index}`)}
                          onToggleSelect={() => toggleSectionSelection(`listening-vocabulary-${index}`)}
                          onEdit={() => openEditor(`listening-vocabulary-${index}`, section.title, section.items)}
                          onDelete={() => deleteSingleSection(`listening-vocabulary-${index}`)}
                        />
                      ))}
                      {result.studentSheet.listeningExercises?.map((section, index) => (
                        <EditableSectionCard
                          key={section.title}
                          title={section.title}
                          items={section.items}
                          selectable={false}
                          selected={selectedSectionIds.includes(`listening-section-${index}`)}
                          onToggleSelect={() => toggleSectionSelection(`listening-section-${index}`)}
                          onEdit={() => openEditor(`listening-section-${index}`, section.title, section.items)}
                          onDelete={() => deleteSingleSection(`listening-section-${index}`)}
                        />
                      ))}
                      {result.studentSheet.wordBank?.length ? (
                        <EditableSectionCard
                          title="Word bank"
                          items={result.studentSheet.wordBank}
                          selectable={false}
                          selected={selectedSectionIds.includes("listening-word-bank")}
                          onToggleSelect={() => toggleSectionSelection("listening-word-bank")}
                          onEdit={() => openEditor("listening-word-bank", "Word bank", result.studentSheet?.wordBank || [])}
                          onDelete={() => deleteSingleSection("listening-word-bank")}
                        />
                      ) : null}
                      {result.studentSheet.followUpDiscussion?.length ? (
                        <EditableSectionCard
                          title="Follow-up discussion"
                          items={result.studentSheet.followUpDiscussion}
                          selectable={false}
                          selected={selectedSectionIds.includes("listening-follow-up")}
                          onToggleSelect={() => toggleSectionSelection("listening-follow-up")}
                          onEdit={() => openEditor("listening-follow-up", "Follow-up discussion", result.studentSheet?.followUpDiscussion || [])}
                          onDelete={() => deleteSingleSection("listening-follow-up")}
                        />
                      ) : null}
                    </section>
                  ) : isQuizMaterial ? (
                    <section className="space-y-3">
                      <h4 className="text-base font-semibold text-[#1F2937]">🧪 Quiz</h4>
                      {result.studentSheet.quizSections?.map((section, index) => (
                        <EditableSectionCard
                          key={section.title}
                          title={section.title}
                          items={section.items}
                          selectable={false}
                          selected={selectedSectionIds.includes(`quiz-section-${index}`)}
                          onToggleSelect={() => toggleSectionSelection(`quiz-section-${index}`)}
                          onEdit={() => openEditor(`quiz-section-${index}`, section.title, section.items)}
                          onDelete={() => deleteSingleSection(`quiz-section-${index}`)}
                        />
                      ))}
                    </section>
                  ) : isRoleplayMaterial ? (
                    <section className="space-y-3">
                      <h4 className="text-base font-semibold text-[#1F2937]">🎭 Roleplay Scenarios</h4>
                      {result.studentSheet.roleplayScenarios?.map((scenario, index) => (
                        <EditableSectionCard
                          key={scenario.title}
                          title={scenario.title}
                          items={[scenario.situation, ...scenario.discuss]}
                          selectable={false}
                          selected={selectedSectionIds.includes(`roleplay-section-${index}`)}
                          onToggleSelect={() => toggleSectionSelection(`roleplay-section-${index}`)}
                          onEdit={() =>
                            openEditor(
                              `roleplay-section-${index}`,
                              scenario.title,
                              [scenario.situation, ...scenario.discuss],
                              "First line is the scenario situation, following lines are discuss prompts."
                            )
                          }
                          onDelete={() => deleteSingleSection(`roleplay-section-${index}`)}
                        />
                      ))}
                    </section>
                  ) : isVocabularyMaterial ? (
                    <>
                      <h4 className="text-base font-semibold text-[#1F2937]">🧠 Useful Vocabulary</h4>
                      {result.studentSheet.vocabularySections?.map((section, index) => (
                        <EditableSectionCard
                          key={section.title}
                          title={section.title}
                          items={section.items}
                          selectable={false}
                          selected={selectedSectionIds.includes(`vocabulary-section-${index}`)}
                          onToggleSelect={() => toggleSectionSelection(`vocabulary-section-${index}`)}
                          onEdit={() => openEditor(`vocabulary-section-${index}`, section.title, section.items)}
                          onDelete={() => deleteSingleSection(`vocabulary-section-${index}`)}
                        />
                      ))}
                      <EditableSectionCard
                        title="Vocabulary"
                        items={result.studentSheet?.vocabulary || []}
                        selectable={false}
                        selected={selectedSectionIds.includes("vocabulary-main")}
                        onToggleSelect={() => toggleSectionSelection("vocabulary-main")}
                        onEdit={() => openEditor("vocabulary-main", "Vocabulary", result.studentSheet?.vocabulary || [])}
                        onDelete={() => deleteSingleSection("vocabulary-main")}
                      />
                      <EditableSectionCard
                        title="👉 Useful phrases"
                        items={result.studentSheet?.usefulPhrases || []}
                        selectable={false}
                        selected={selectedSectionIds.includes("vocabulary-phrases")}
                        onToggleSelect={() => toggleSectionSelection("vocabulary-phrases")}
                        onEdit={() => openEditor("vocabulary-phrases", "Useful phrases", result.studentSheet?.usefulPhrases || [])}
                        onDelete={() => deleteSingleSection("vocabulary-phrases")}
                      />
                    </>
                  ) : (
                    <>
                      <h4 className="text-base font-semibold text-[#1F2937]">🗣️ Speaking Questions</h4>
                      {result.studentSheet.easierQuestions?.length ? (
                        <EditableSectionCard
                          title="🟢 Easier Questions"
                          items={result.studentSheet?.easierQuestions || []}
                          selectable={false}
                          selected={selectedSectionIds.includes("speaking-easier")}
                          onToggleSelect={() => toggleSectionSelection("speaking-easier")}
                          onEdit={() => openEditor("speaking-easier", "Easier Questions", result.studentSheet?.easierQuestions || [])}
                          onDelete={() => deleteSingleSection("speaking-easier")}
                        />
                      ) : null}
                      {result.studentSheet.mainDiscussionQuestions?.length ? (
                        <EditableSectionCard
                          title="🔵 Main Discussion"
                          items={result.studentSheet?.mainDiscussionQuestions || []}
                          selectable={false}
                          selected={selectedSectionIds.includes("speaking-main")}
                          onToggleSelect={() => toggleSectionSelection("speaking-main")}
                          onEdit={() => openEditor("speaking-main", "Main Discussion", result.studentSheet?.mainDiscussionQuestions || [])}
                          onDelete={() => deleteSingleSection("speaking-main")}
                        />
                      ) : null}
                      {result.studentSheet.deeperDiscussionQuestions?.length ? (
                        <EditableSectionCard
                          title="🔴 Deeper Discussion"
                          items={result.studentSheet?.deeperDiscussionQuestions || []}
                          selectable={false}
                          selected={selectedSectionIds.includes("speaking-deeper")}
                          onToggleSelect={() => toggleSectionSelection("speaking-deeper")}
                          onEdit={() => openEditor("speaking-deeper", "Deeper Discussion", result.studentSheet?.deeperDiscussionQuestions || [])}
                          onDelete={() => deleteSingleSection("speaking-deeper")}
                        />
                      ) : null}
                      {!result.studentSheet.easierQuestions?.length &&
                      !result.studentSheet.mainDiscussionQuestions?.length &&
                      !result.studentSheet.deeperDiscussionQuestions?.length ? (
                        <EditableSectionCard
                          title="🔵 Main Discussion"
                          items={result.studentSheet?.speakingQuestions || []}
                          selectable={false}
                          selected={selectedSectionIds.includes("speaking-fallback")}
                          onToggleSelect={() => toggleSectionSelection("speaking-fallback")}
                          onEdit={() => openEditor("speaking-fallback", "Main Discussion", result.studentSheet?.speakingQuestions || [])}
                          onDelete={() => deleteSingleSection("speaking-fallback")}
                        />
                      ) : null}
                    </>
                  )}
                  </div>
                </section>
              ) : null}
              {result.teacherNotes ? (
                <section className="rounded-2xl bg-[#FFF5F8] p-4">
                  <h3 className="font-semibold text-[#1F2937]">Teacher Notes</h3>
                  <MaterialSection title="Correction focus" items={result.teacherNotes.correctionFocus} />
                  <MaterialSection title="Follow-up ideas" items={result.teacherNotes.followUpIdeas} />
                  <MaterialSection title="Conversation expansion" items={result.teacherNotes.conversationExpansion} />
                  <MaterialSection title="Possible grammar/pronunciation issues" items={result.teacherNotes.possibleIssues} />
                </section>
              ) : null}
              {!isSimpleConversationSheet && result.speakingPrompts?.length ? <MaterialSection title="Speaking prompts" items={result.speakingPrompts} /> : null}
              {!isSimpleConversationSheet && result.correctionsFocus?.length ? <MaterialSection title="Corrections focus" items={result.correctionsFocus} /> : null}
              {!isSimpleConversationSheet ? (
                <section className="rounded-2xl bg-[#FFF5F8] p-4">
                  <h3 className="font-semibold text-[#1F2937]">Vocabulary section</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                    {result.vocabulary.map((item) => (
                      <li key={item.term}>
                        <span className="font-semibold">{item.term}:</span> {item.task}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {!isSimpleConversationSheet && result.followUpQuestions?.length ? <MaterialSection title="Follow-up questions" items={result.followUpQuestions} /> : null}
              {!isSimpleConversationSheet && result.homeworkSuggestion ? (
                <section className="rounded-2xl bg-[#FFF5F8] p-4">
                  <h3 className="font-semibold text-[#1F2937]">Homework suggestion</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{result.homeworkSuggestion}</p>
                </section>
              ) : null}
            </div>
            {reuseCandidate && reuseCandidate.score >= 4 ? (
              <section className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
                <p className="text-sm font-semibold text-[#1F2937]">
                  This material may also work for {reuseCandidate.student.name}. Reuse it?
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Recommendation uses level, shared interests, focus area, and vocabulary overlap.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStudentId(reuseCandidate.student.id);
                    setLevel(reuseCandidate.student.level);
                    showToast({ type: "success", title: "Student switched", description: `Ready to reuse for ${reuseCandidate.student.name}.` });
                  }}
                  className="mt-3 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-[#FF4F7B] transition hover:border-[#FF4F7B]"
                >
                  Switch to {reuseCandidate.student.name}
                </button>
              </section>
            ) : null}

            <section className="mt-5 rounded-2xl border border-rose-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  {savedMaterialId ? (
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">
                        {sourceLessonId ? "Saved and attached to this lesson." : "Saved to Materials Library."}
                      </p>
                      {sourceLessonId ? (
                        <Link
                          href={`/lesson-planner?lesson=${sourceLessonId}`}
                          className="mt-2 inline-flex rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                        >
                          Return to lesson
                        </Link>
                      ) : null}
                    </div>
                  ) : saveError ? (
                    <p className="text-sm font-semibold text-rose-700">{saveError}</p>
                  ) : (
                    <p className="text-sm text-slate-600">Save this material to Supabase and link it to {selectedStudent?.name}.</p>
                  )}
                </div>
                <button
                  type="button"
                  data-testid="save-material"
                  disabled={isSaving}
                  onClick={saveMaterial}
                  className="flex items-center gap-2 rounded-xl bg-[#FF4F7B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69] disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <Save size={16} aria-hidden="true" />
                  {isSaving ? "Saving..." : "Save material"}
                </button>
              </div>
            </section>

            {copyState === "error" ? <p className="mt-3 text-sm text-rose-700">Copy failed. Select the material text manually.</p> : null}
          </article>
        ) : (
          <div className="grid min-h-96 place-items-center rounded-2xl bg-[#FFF5F8] p-8 text-center">
            <div>
              <Sparkles className="mx-auto text-[#FF4F7B]" size={34} aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold text-[#1F2937]">Ready to generate</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                Choose a student and material brief to create a realistic teaching material from their saved memory.
              </p>
            </div>
          </div>
        )}
        {editingSection ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 py-8">
            <section className="w-full max-w-2xl rounded-3xl border border-rose-100 bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                <h3 className="text-lg font-semibold text-[#1F2937]">Edit section · {editingSection.title}</h3>
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="rounded-xl border border-rose-100 p-2 text-slate-600 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
                  aria-label="Close section editor"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
              {editingSection.helper ? <p className="mt-3 text-sm text-slate-600">{editingSection.helper}</p> : null}
              <textarea
                value={editingSection.value}
                onChange={(event) => setEditingSection((current) => (current ? { ...current, value: event.target.value } : current))}
                className="mt-3 min-h-64 w-full rounded-2xl border border-rose-100 bg-white px-3 py-3 text-sm leading-6 text-[#1F2937] outline-none ring-[#FF4F7B] focus:ring-2"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveSectionEdit}
                  className="rounded-xl bg-[#FF4F7B] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#E63E69]"
                >
                  Save
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function StudentContextPanel({ student, onUsePreviousLesson }: { student: TeachingStudent; onUsePreviousLesson: (lessonId: string) => void }) {
  const previousLesson = student.lessonHistory[0];
  const recentlyStudiedTopics = getRecentlyStudiedTopics(student, 4);
  const suggestedNextTopics = getSuggestedNextTopics(student, 4);
  const reviewNeeds = getStudentReviewNeeds(student, 5);
  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-[#FF4F7B]">Student context</p>
      <div className="mt-4 grid gap-3">
        <ContextBlock label="Goals" value={student.goals.join("; ") || "No goals saved yet"} />
        <ContextBlock label="Memory summary" value={`Review ${student.memorySummary.reviewNext.join(", ") || "no saved items"}; avoid ${student.memorySummary.avoidRepeating.join(", ") || "nothing flagged"}.`} />
        <ContextBlock label="Interests" value={student.interests.join(", ") || "No interests saved yet"} />
        <ContextBlock label="Recurring mistakes" value={student.recurringMistakes.join("; ") || "No mistakes saved yet"} />
        <ContextBlock label="Vocabulary to review" value={student.vocabularyToReview.join(", ") || "No vocabulary saved yet"} />
        <ContextBlock label="Previous lesson topics" value={student.lessonHistory.slice(0, 3).map((lesson) => lesson.topic || lesson.title).join(", ") || previousLesson?.title || "No previous lesson saved yet"} />
        <ContextBlock label="Recently studied" value={recentlyStudiedTopics.join(", ") || "No topic history yet"} />
        <ContextBlock label="Suggested next topics" value={suggestedNextTopics.join(", ") || "Add more memory to unlock suggestions"} />
        <ContextBlock label="Review needs" value={reviewNeeds.join(", ") || "No review needs saved yet"} />
      </div>
      {student.lessonHistory.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Generate from previous lesson</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {student.lessonHistory.slice(0, 3).map((lesson) => (
              <button
                key={lesson.id}
                type="button"
                onClick={() => onUsePreviousLesson(lesson.id)}
                className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
              >
                {lesson.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function GenerationHistory({ generations }: { generations: AiGenerationHistoryItem[] }) {
  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <History size={18} className="text-[#FF4F7B]" aria-hidden="true" />
        <p className="text-sm font-semibold text-[#1F2937]">Generation history</p>
      </div>
      {generations.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">No OpenAI generations saved for this student yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {generations.slice(0, 5).map((generation) => (
            <div key={generation.id} className="rounded-2xl bg-[#FFF5F8] px-3 py-3">
              <p className="text-sm font-semibold text-[#1F2937]">{generation.content.title}</p>
              <p className="mt-1 text-xs text-slate-600">
                {generation.materialType} · {generation.topic || "No topic"} · variation {generation.variation} · {generation.createdAt}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ContextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#FFF5F8] px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function MaterialSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-2xl border border-rose-100 bg-white p-4">
      {title ? <h3 className="text-sm font-semibold text-[#1F2937]">{title}</h3> : null}
      <ul className={`${title ? "mt-2 " : ""}space-y-2 text-sm leading-6 text-slate-700`}>
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </section>
  );
}

function EditableSectionCard({
  title,
  items,
  selectable,
  selected,
  onToggleSelect,
  onEdit,
  onDelete
}: {
  title: string;
  items: string[];
  selectable: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <section
      className={`rounded-2xl border p-4 transition ${
        selected ? "border-[#FF4F7B] bg-rose-50" : "border-rose-100 bg-white hover:border-rose-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h5 className="text-sm font-semibold text-[#1F2937]">{title}</h5>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
          >
            <Pencil size={12} aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-50"
          >
            <Trash2 size={12} aria-hidden="true" />
            Delete
          </button>
          {selectable ? (
            <button
              type="button"
              onClick={onToggleSelect}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                selected
                  ? "border-[#FF4F7B] bg-rose-100 text-[#E63E69]"
                  : "border-rose-200 bg-white text-slate-700 hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
              }`}
            >
              {selected ? <CheckSquare2 size={12} aria-hidden="true" /> : <Square size={12} aria-hidden="true" />}
              {selected ? "Selected" : "Select"}
            </button>
          ) : null}
        </div>
      </div>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </section>
  );
}

function Select({
  label,
  value,
  onChange,
  children
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  const options = useMemo(
    () =>
      (Array.isArray(children) ? children : [children])
        .filter(Boolean)
        .map((node) => {
          if (!node || typeof node !== "object" || !("props" in node)) return null;
          const option = node as React.ReactElement<{ value?: string; children?: React.ReactNode }>;
          const optionValue = String(option.props.value ?? "");
          const label =
            typeof option.props.children === "string"
              ? option.props.children
              : Array.isArray(option.props.children)
                ? option.props.children.join("")
                : optionValue;
          return { value: optionValue, label };
        })
        .filter((item): item is { value: string; label: string } => Boolean(item)),
    [children]
  );

  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <AppSelect value={value} onChange={onChange} options={options} className="mt-2" />
    </label>
  );
}

function normalizeMaterialType(value: string | null): MaterialType {
  const normalized = String(value || "").trim().toLowerCase().replace(/[_-]/g, " ");
  if (normalized === "quiz") return "Quiz";
  if (normalized === "speaking" || normalized === "speaking questions") return "Speaking questions";
  if (normalized === "vocabulary" || normalized === "vocabulary sheet") return "Vocabulary sheet";
  if (normalized === "roleplay") return "Roleplay";
  if (normalized === "listening" || normalized === "listening activity") return "Listening activity";
  return "Speaking questions";
}

function normalizeLevel(value: CefrLevel | null): CefrLevel | null {
  return value && cefrLevels.includes(value) ? value : null;
}
