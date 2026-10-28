export type AnalyticsEventName =
  | "student_created"
  | "student_deleted"
  | "student_viewed"
  | "material_generated"
  | "material_saved"
  | "material_deleted"
  | "material_reused"
  | "material_opened"
  | "speaking_generated"
  | "vocabulary_generated"
  | "quiz_generated"
  | "roleplay_generated"
  | "lesson_created"
  | "lesson_completed"
  | "lesson_deleted"
  | "lesson_restored"
  | "weekly_prep_opened"
  | "prepare_my_week_clicked"
  | "reusable_material_used"
  | "demo_workspace_loaded"
  | "first_student_created"
  | "first_material_generated"
  | "landing_viewed"
  | "start_free_clicked"
  | "view_demo_clicked"
  | "generation_success"
  | "generation_error";

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  properties?: AnalyticsProperties;
  createdAt: string;
};

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com").replace(/\/$/, "");

export function trackEvent(name: AnalyticsEventName, properties: AnalyticsProperties = {}) {
  const event: AnalyticsEvent = {
    name,
    properties: sanitizeProperties(properties),
    createdAt: new Date().toISOString()
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("lessonflow:analytics", { detail: event }));
    captureClientEvent(event);
    return;
  }

  captureServerEvent(event).catch(() => undefined);
}

export function getMaterialGenerationEvent(materialType: string): AnalyticsEventName {
  const normalized = materialType.toLowerCase();
  if (normalized.includes("speaking")) return "speaking_generated";
  if (normalized.includes("vocabulary")) return "vocabulary_generated";
  if (normalized.includes("quiz")) return "quiz_generated";
  if (normalized.includes("roleplay")) return "roleplay_generated";
  return "material_generated";
}

function sanitizeProperties(properties: AnalyticsProperties): AnalyticsProperties {
  const allowed = new Set([
    "studentId",
    "materialId",
    "lessonId",
    "generationId",
    "materialType",
    "level",
    "duration",
    "mode",
    "source",
    "status",
    "variation",
    "count",
    "weekStart",
    "hasRelatedMaterial",
    "isFirst",
    "route",
    "location",
    "source",
    "topicPresent",
    "skillFocus"
  ]);

  return Object.fromEntries(
    Object.entries(properties)
      .filter(([key, value]) => allowed.has(key) && value !== undefined)
      .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 120) : value])
  );
}

function getDistinctId() {
  if (typeof window === "undefined") return "server";
  const key = "lessonflow.analytics-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(key, next);
  return next;
}

function captureClientEvent(event: AnalyticsEvent) {
  if (!POSTHOG_KEY) {
    if (process.env.NODE_ENV === "development") console.info("[analytics-ready]", event);
    return;
  }

  const payload = JSON.stringify({
    api_key: POSTHOG_KEY,
    event: event.name,
    distinct_id: getDistinctId(),
    properties: {
      ...event.properties,
      app: "lessonflow",
      captured_at: event.createdAt
    }
  });

  try {
    const url = `${POSTHOG_HOST}/capture/`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
      return;
    }
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => undefined);
  } catch {
    // Analytics must never affect product flows.
  }
}

async function captureServerEvent(event: AnalyticsEvent) {
  if (!POSTHOG_KEY) {
    if (process.env.NODE_ENV === "development") console.info("[analytics-ready]", event);
    return;
  }

  await fetch(`${POSTHOG_HOST}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: POSTHOG_KEY,
      event: event.name,
      distinct_id: typeof event.properties?.studentId === "string" ? event.properties.studentId : "server",
      properties: {
        ...event.properties,
        app: "lessonflow",
        captured_at: event.createdAt
      }
    })
  });
}
