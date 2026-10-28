import { NextResponse } from "next/server";
import { generateTeachingMaterial, AiServiceError, buildPromptContext } from "@/lib/ai/material-service";
import { createClient } from "@/lib/supabase/server";
import { createAiGeneration, getStudentProfile } from "@/lib/supabase/teaching-data";
import { generateMockMaterial } from "@/lib/mock-generation";
import { cleanTranscript, retrieveYouTubeTranscript, YouTubeTranscriptError } from "@/lib/youtube-transcript";
import type { CefrLevel } from "@/lib/types";
import type { GapFillFocus, LessonGenerationMode, ListeningExerciseLength, ListeningExerciseType, MaterialType, QuizType, RoleplayContext, VocabularyDensity } from "@/lib/teaching-types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in before generating material.", code: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};

  try {
    body = (await request.json()) as Record<string, unknown>;
    const studentId = String(body.studentId || "");
    if (!studentId) {
      return NextResponse.json({ ok: false, error: "Choose a student before generating.", code: "missing_student" }, { status: 400 });
    }

    const { student, error } = await getStudentProfile(studentId);
    if (error) return NextResponse.json({ ok: false, error, code: "student_fetch_failed" }, { status: 500 });
    if (!student) return NextResponse.json({ ok: false, error: "Student not found.", code: "student_not_found" }, { status: 404 });

    const materialType = String(body.materialType || "Speaking questions") as MaterialType;
    const requestedTopic = String(body.topic || "").trim();
    if (!requestedTopic) {
      return NextResponse.json({ ok: false, error: "Please enter a topic.", code: "missing_topic" }, { status: 400 });
    }
    const youtubeUrl = String(body.youtubeUrl || "").trim();
    const manualTranscript = cleanTranscript(String(body.manualTranscript || ""));
    let transcript = "";
    let transcriptSourceUrl = "";
    if (materialType === "Listening activity") {
      if (manualTranscript) {
        transcript = manualTranscript;
        transcriptSourceUrl = youtubeUrl || "manual transcript fallback";
      } else {
        if (!youtubeUrl) {
          return NextResponse.json({ ok: false, error: "Add a YouTube URL before generating a listening activity.", code: "missing_youtube_url" }, { status: 400 });
        }
        const transcriptResult = await retrieveYouTubeTranscript(youtubeUrl);
        transcript = transcriptResult.transcript;
        transcriptSourceUrl = transcriptResult.sourceUrl;
      }
    }

    const input = {
      student,
      materialType,
      level: String(body.level || student.level) as CefrLevel,
      topic: requestedTopic,
      skillFocus: String(body.teachingFocus || body.skillFocus || "Fluency"),
      duration: String(body.duration || "45 minutes"),
      extraInstructions: String(body.extraInstructions || ""),
      variation: Math.max(1, Number(body.variation || 1)),
      mode: String(body.mode || "Conversational") as LessonGenerationMode,
      youtubeUrl: transcriptSourceUrl || youtubeUrl,
      transcript,
      listeningExerciseType: String(body.listeningExerciseType || "Both") as ListeningExerciseType,
      gapFillFocus: String(body.gapFillFocus || "Topic Vocabulary") as GapFillFocus,
      numberOfGaps: String(body.numberOfGaps || "10"),
      vocabularyDensity: String(body.vocabularyDensity || "") as VocabularyDensity,
      listeningLength: String(body.listeningLength || "") as ListeningExerciseLength,
      quizType: String(body.quizType || "") as QuizType,
      quizQuestionCount: String(body.quizQuestionCount || ""),
      roleplayScenarioCount: String(body.roleplayScenarioCount || ""),
      roleplayContext: String(body.roleplayContext || "") as RoleplayContext
    };

    const generation = await generateTeachingMaterial(input);
    let generationId = "";
    let warning = "";
    let warningCode = "";
    try {
      generationId = await createAiGeneration(user.id, {
        studentId: student.id,
        materialType: input.materialType,
        topic: input.topic,
        level: input.level,
        skillFocus: input.skillFocus,
        duration: input.duration,
        inputContext: { ...buildPromptContext(student), youtubeUrl: input.youtubeUrl, transcriptPreview: transcript.slice(0, 800) },
        outputContent: generation.content,
        variation: input.variation,
        status: "completed"
      });
    } catch {
      warning = "Material generated, but generation history could not be saved.";
      warningCode = "generation_history_save_failed";
    }

    if (process.env.NODE_ENV === "development") {
      console.info("[ai.generate] model=%s in=%s out=%s duration_ms=%s", generation.debug.model, generation.debug.inputTokens ?? "n/a", generation.debug.outputTokens ?? "n/a", generation.debug.durationMs);
    }

    return NextResponse.json({ ok: true, content: generation.content, generationId, source: "openai", warning, warningCode });
  } catch (error) {
    if (error instanceof AiServiceError) {
      if (error.code === "missing_api_key") {
        try {
          const studentId = String(body.studentId || "");
          const { student } = await getStudentProfile(studentId);
          if (student) {
            const materialType = String(body.materialType || "Speaking questions") as MaterialType;
            const youtubeUrl = String(body.youtubeUrl || "").trim();
            const manualTranscript = cleanTranscript(String(body.manualTranscript || ""));
            let transcript = "";
            let transcriptSourceUrl = "";
            if (materialType === "Listening activity") {
              if (manualTranscript) {
                transcript = manualTranscript;
                transcriptSourceUrl = youtubeUrl || "manual transcript fallback";
              } else {
                if (!youtubeUrl) {
                  return NextResponse.json({ ok: false, error: "Add a YouTube URL before generating a listening activity.", code: "missing_youtube_url" }, { status: 400 });
                }
                const transcriptResult = await retrieveYouTubeTranscript(youtubeUrl);
                transcript = transcriptResult.transcript;
                transcriptSourceUrl = transcriptResult.sourceUrl;
              }
            }
            const requestedTopic = String(body.topic || "").trim();
            if (!requestedTopic) {
              return NextResponse.json({ ok: false, error: "Please enter a topic.", code: "missing_topic" }, { status: 400 });
            }
            const input = {
              student,
              materialType,
              level: String(body.level || student.level) as CefrLevel,
              topic: requestedTopic,
              skillFocus: String(body.teachingFocus || body.skillFocus || "Fluency"),
              duration: String(body.duration || "45 minutes"),
              extraInstructions: String(body.extraInstructions || ""),
              variation: Math.max(1, Number(body.variation || 1)),
              mode: String(body.mode || "Conversational") as LessonGenerationMode,
              youtubeUrl: transcriptSourceUrl || youtubeUrl,
              transcript,
              listeningExerciseType: String(body.listeningExerciseType || "Both") as ListeningExerciseType,
              gapFillFocus: String(body.gapFillFocus || "Topic Vocabulary") as GapFillFocus,
              numberOfGaps: String(body.numberOfGaps || "10"),
              vocabularyDensity: String(body.vocabularyDensity || "") as VocabularyDensity,
              listeningLength: String(body.listeningLength || "") as ListeningExerciseLength,
              quizType: String(body.quizType || "") as QuizType,
              quizQuestionCount: String(body.quizQuestionCount || ""),
              roleplayScenarioCount: String(body.roleplayScenarioCount || ""),
              roleplayContext: String(body.roleplayContext || "") as RoleplayContext
            };
            const content = generateMockMaterial(input);
            let generationId = "";
            try {
              generationId = await createAiGeneration(user.id, {
                studentId: student.id,
                materialType: input.materialType,
                topic: input.topic,
                level: input.level,
                skillFocus: input.skillFocus,
                duration: input.duration,
                inputContext: { ...buildPromptContext(student), youtubeUrl: input.youtubeUrl, transcriptPreview: transcript.slice(0, 800) },
                outputContent: content,
                variation: input.variation,
                status: "completed"
              });
            } catch {
              // Ignore history save failure for dev fallback.
            }
            return NextResponse.json({
              ok: true,
              content,
              generationId,
              source: "mock",
              warning: process.env.NODE_ENV === "development" ? "OPENAI_API_KEY missing. Using local mock generation." : ""
            });
          }
        } catch {
          // Continue with explicit error response if fallback cannot be built.
        }
      }

      const status = error.code === "missing_api_key" ? 503 : error.code === "rate_limit" ? 429 : 502;
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status });
    }

    if (error instanceof YouTubeTranscriptError) {
      const status = error.code === "invalid_url" ? 400 : error.code === "transcript_unavailable" ? 422 : 502;
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status });
    }

    return NextResponse.json({ ok: false, error: "Could not generate material.", code: "unexpected_error" }, { status: 500 });
  }
}
