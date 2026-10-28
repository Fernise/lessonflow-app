import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { createClient } from "@/lib/supabase/server";
import { cefrLevels, type CefrLevel, type LessonContent } from "@/lib/types";
import {
  buildLessonMessages,
  createMockLessonContent,
  normalizeLessonContent
} from "@/lib/generation.mjs";

export const runtime = "nodejs";

const MAX_INPUT_LENGTH = 12000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const inputText = String(body?.inputText || "").trim();
  const cefrLevel = String(body?.cefrLevel || "") as CefrLevel;

  if (inputText.length < 80) {
    return NextResponse.json({ error: "Please provide at least 80 characters of source text." }, { status: 400 });
  }

  if (inputText.length > MAX_INPUT_LENGTH) {
    return NextResponse.json({ error: "Source text is too long for this MVP." }, { status: 400 });
  }

  if (!cefrLevels.includes(cefrLevel)) {
    return NextResponse.json({ error: "Unsupported CEFR level." }, { status: 400 });
  }

  let result: LessonContent;
  try {
    result = await generateLessonContent({ inputText, cefrLevel });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate lesson materials.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("lesson_generations")
    .insert({
      user_id: user.id,
      input_text: inputText,
      cefr_level: cefrLevel,
      result
    })
    .select("id,user_id,input_text,cefr_level,result,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ generation: data });
}

async function generateLessonContent({
  inputText,
  cefrLevel
}: {
  inputText: string;
  cefrLevel: CefrLevel;
}): Promise<LessonContent> {
  if (process.env.MOCK_OPENAI === "true") {
    return createMockLessonContent({ inputText, cefrLevel }) as LessonContent;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured. Set MOCK_OPENAI=true for local demo output.");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const messages = buildLessonMessages({ inputText, cefrLevel }) as ChatCompletionMessageParam[];
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.4,
    messages
  });

  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  return normalizeLessonContent(content) as LessonContent;
}
