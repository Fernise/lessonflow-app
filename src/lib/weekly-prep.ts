import type {
  LessonPlanSummary,
  TeachingMaterial,
  TeachingStudent,
  WeeklyPreparationSuggestion
} from "./teaching-types";
import { getMaterialSearchText } from "./material-intelligence";
import { getAttachedMaterialIds, getAttachedMaterials, getMaterialReadiness } from "./lesson-materials";

export function getCurrentWeekStart(date = new Date()) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next.toISOString().slice(0, 10);
}

export function buildWeeklyPreparationSuggestions({
  weekStart,
  students,
  lessons,
  materials
}: {
  weekStart: string;
  students: TeachingStudent[];
  lessons: LessonPlanSummary[];
  materials: TeachingMaterial[];
}): WeeklyPreparationSuggestion {
  const safeStudents = Array.isArray(students) ? students : [];
  const safeLessons = Array.isArray(lessons) ? lessons : [];
  const safeMaterials = Array.isArray(materials) ? materials : [];
  if (process.env.NODE_ENV === "development") {
    logArrayState("weekly-prep.students", students);
    logArrayState("weekly-prep.lessons", lessons);
    logArrayState("weekly-prep.materials", materials);
  }
  const weekLessons = safeLessons
    .filter((lesson) => isInSelectedWeek(lesson.rawDate, weekStart))
    .filter((lesson) => lesson.status !== "cancelled");
  const activeWeekLessons = weekLessons.filter((lesson) => lesson.status === "planned");
  const plannedStudentIds = new Set(weekLessons.map((lesson) => lesson.studentId));
  const weekStudents = safeStudents.filter((student) => plannedStudentIds.has(student.id));
  const missingStudents = safeStudents
    .filter((student) => student.lessonFrequency)
    .filter((student) => !plannedStudentIds.has(student.id));
  const topicGroups = groupTopics(weekStudents, weekLessons);
  const vocabulary = unique(weekStudents.flatMap((student) => safeStringArray(student.memorySummary?.vocabularyToRecycle).slice(0, 5))).slice(0, 24);

  const checklist = weekLessons.map((lesson) => {
    const student = safeStudents.find((item) => item.id === lesson.studentId);
    const reusable = getReusableMaterialsForLesson(lesson, safeMaterials);
    const attachedMaterials = getAttachedMaterials(lesson, safeMaterials);
    const readiness = getMaterialReadiness(attachedMaterials);
    const isCompleted = lesson.status === "completed";
    return {
      studentId: lesson.studentId,
      studentName: lesson.studentName,
      lessonId: lesson.id,
      lessonStatus: lesson.status,
      lessonDate: lesson.rawDate,
      topic: lesson.topic || lesson.lessonGoal || student?.nextSuggestedFocus || "Topic not set",
      level: lesson.studentLevel,
      suggestedNextFocus: student?.nextSuggestedFocus || "",
      lessonPlanReady: Boolean(lesson.lessonGoal && hasStructureContent(lesson.lessonStructure)),
      speakingMaterialReady: readiness.Speaking,
      vocabularyMaterialReady: readiness.Vocabulary,
      materialReady: attachedMaterials.length > 0 || isCompleted,
      homeworkReady: Boolean(lesson.homeworkAssigned || lesson.lessonStructure.homework),
      notesReady: Boolean(lesson.teacherNotes) || isCompleted,
      reusableMaterialIds: reusable.slice(0, 4).map((item) => item.id),
      attachedMaterialIds: getAttachedMaterialIds(lesson)
    };
  });

  const reusableMaterials = uniqueById(
    checklist.flatMap((item) => item.reusableMaterialIds.map((id) => safeMaterials.find((material) => material.id === id)).filter(Boolean) as TeachingMaterial[])
  )
    .slice(0, 12)
    .map((material) => ({
      materialId: material.id,
      title: material.title,
      topic: material.topic,
      studentNames: weekStudents
        .filter((student) => {
          const lessonTopics = activeWeekLessons
            .filter((lesson) => lesson.studentId === student.id)
            .map((lesson) => lesson.topic || lesson.lessonGoal);
          return lessonTopics.some((topic) => isTopicSimilar(topic, material.topic)) || student.level === material.level;
        })
        .map((student) => student.name)
    }));

  return {
    priorityLessons: [
      ...checklist
        .filter((row) => row.lessonStatus !== "completed")
        .filter((row) => !row.materialReady || !row.lessonPlanReady || !row.notesReady)
        .map((row) => ({
          studentId: row.studentId,
          studentName: row.studentName,
          lessonDate: row.lessonDate,
          topic: row.topic,
          reason: !row.materialReady
            ? "No linked material"
            : !row.speakingMaterialReady
              ? "Missing speaking questions"
              : !row.vocabularyMaterialReady
                ? "Could use vocabulary support"
              : !row.lessonPlanReady
                ? "Lesson structure needs completion"
                : "Notes or review items are still missing"
        })),
      ...missingStudents.map((student) => ({
        studentId: student.id,
        studentName: student.name,
        lessonDate: "Unscheduled",
        topic: student.nextSuggestedFocus,
        reason: "Student has no lesson plan this week"
      }))
    ].slice(0, 8),
    reusableMaterials,
    sharedTopics: topicGroups,
    vocabularyReviewList: vocabulary,
    suggestedHomework: weekStudents.slice(0, 8).map((student) => ({
      studentName: student.name,
      homework: student.aiSuggestions.suggestedHomework
    })),
    risksReminders: [
      ...missingStudents.map((student) => `${student.name} has no planned lesson this week.`),
      ...checklist
        .filter((item) => item.lessonStatus !== "completed")
        .filter((item) => !item.materialReady)
        .map((item) => `${item.studentName} has no linked material for ${item.topic}.`),
      ...weekStudents
        .filter((student) => safeStringArray(student.memorySummary?.avoidRepeating).length > 0)
        .map((student) => `Avoid repeating for ${student.name}: ${safeStringArray(student.memorySummary?.avoidRepeating).join(", ")}.`)
    ].slice(0, 10),
    checklist
  };
}

function hasStructureContent(structure: LessonPlanSummary["lessonStructure"]) {
  return Boolean(
    structure?.warmUp ||
      structure?.review ||
      structure?.mainSpeakingTask ||
      structure?.vocabularyActivation ||
      structure?.listeningReadingActivity ||
      structure?.correctionAndFeedback
  );
}

function groupTopics(students: TeachingStudent[], lessons: LessonPlanSummary[]) {
  const pairs = [
    ...students.flatMap((student) =>
      student.preferredTopics.slice(0, 3).map((topic) => ({ topic, studentName: student.name }))
    ),
    ...lessons.map((lesson) => ({ topic: lesson.topic, studentName: lesson.studentName }))
  ].filter((item) => item.topic);

  const groups = new Map<string, { topic: string; studentNames: Set<string> }>();
  pairs.forEach(({ topic, studentName }) => {
    const key = normalize(topic);
    const current = groups.get(key) || { topic, studentNames: new Set<string>() };
    current.studentNames.add(studentName);
    groups.set(key, current);
  });

  return Array.from(groups.values())
    .filter((group) => group.studentNames.size > 1)
    .map((group) => ({ topic: group.topic, studentNames: Array.from(group.studentNames) }))
    .slice(0, 8);
}

function isSpeakingMaterial(material: TeachingMaterial) {
  const type = `${material.exerciseType} ${material.skill}`.toLowerCase();
  return type.includes("speaking") || type.includes("roleplay") || type.includes("conversation");
}

function isVocabularyMaterial(material: TeachingMaterial) {
  const type = `${material.exerciseType} ${material.skill}`.toLowerCase();
  return type.includes("vocabulary");
}

function getReusableMaterialsForLesson(lesson: LessonPlanSummary, materials: TeachingMaterial[]) {
  return materials.filter((material) => {
    const sameStudent = material.studentId === lesson.studentId;
    const sameLevel = material.level === lesson.studentLevel;
    const topicMatch = isTopicSimilar(material.topic, lesson.topic || lesson.lessonGoal) || isMetadataTopicSimilar(material, lesson.topic || lesson.lessonGoal);
    const skillMatch = isSkillSimilar(material, lesson.skillFocus || lesson.focus);
    return sameStudent || (sameLevel && topicMatch) || (sameLevel && skillMatch && topicMatch);
  });
}

function isSkillSimilar(material: TeachingMaterial, skill: string) {
  const metadataSkills = material.metadata?.skills?.join(" ") || "";
  const materialSkill = `${material.skill} ${material.exerciseType} ${metadataSkills}`.toLowerCase();
  const target = skill.toLowerCase();
  if (!target) return false;
  if (target.includes("speaking")) return materialSkill.includes("speaking") || materialSkill.includes("roleplay");
  if (target.includes("vocabulary")) return materialSkill.includes("vocabulary");
  if (target.includes("quiz")) return materialSkill.includes("quiz");
  return materialSkill.includes(target);
}

function isMetadataTopicSimilar(material: TeachingMaterial, topic: string) {
  const targetTokens = tokenize(topic);
  if (targetTokens.length === 0) return false;
  const metadataText = getMaterialSearchText(material.metadata).toLowerCase();
  return targetTokens.some((token) => metadataText.includes(token));
}

function isTopicSimilar(a: string, b: string) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return left.includes(right) || right.includes(left);
}

function uniqueById(items: TeachingMaterial[]) {
  const byId = new Map<string, TeachingMaterial>();
  items.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values());
}

function isInSelectedWeek(date: string, weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const value = new Date(`${date}T00:00:00`);
  return value >= start && value < end;
}

function unique(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function tokenize(value: string) {
  return normalize(value)
    .split(/\s+/)
    .filter((token) => token.length > 3);
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function logArrayState(name: string, value: unknown) {
  if (value == null || !Array.isArray(value)) {
    console.info("[weekly-prep] nullable array guard", {
      variable: name,
      type: typeof value,
      value
    });
  }
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
