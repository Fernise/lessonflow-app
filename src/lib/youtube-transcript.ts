export type YouTubeTranscriptResult = {
  videoId: string;
  transcript: string;
  sourceUrl: string;
  title?: string;
  provider: "supadata" | "youtube-captions";
};

export class YouTubeTranscriptError extends Error {
  constructor(
    public code: "invalid_url" | "transcript_unavailable" | "fetch_failed",
    message: string
  ) {
    super(message);
  }
}

export async function retrieveYouTubeTranscript(url: string): Promise<YouTubeTranscriptResult> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new YouTubeTranscriptError("invalid_url", "Enter a valid YouTube video URL.");
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const supadataResult = await trySupadataTranscript(watchUrl, videoId);
  if (supadataResult) return supadataResult;

  let page = "";
  try {
    const response = await fetch(watchUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
        "accept-language": "en-US,en;q=0.9"
      }
    });
    if (!response.ok) throw new Error(`YouTube returned ${response.status}`);
    page = await response.text();
  } catch {
    throw new YouTubeTranscriptError("fetch_failed", "Could not reach YouTube to retrieve the transcript.");
  }

  const captionUrl = findCaptionTrackUrl(page);
  if (!captionUrl) {
    const hasSupadataKey = Boolean(getSupadataApiKey());
    throw new YouTubeTranscriptError(
      "transcript_unavailable",
      hasSupadataKey
        ? "No transcript was found for this video. You can paste the transcript manually as a fallback."
        : "No public transcript was found for this video. Add SUPADATA_API_KEY for stronger retrieval, or paste the transcript manually."
    );
  }

  try {
    const transcriptResponse = await fetch(captionUrl);
    if (!transcriptResponse.ok) throw new Error(`Caption request returned ${transcriptResponse.status}`);
    const rawTranscript = await transcriptResponse.text();
    const transcript = cleanTranscript(parseTranscriptText(rawTranscript));
    if (!transcript) {
      throw new YouTubeTranscriptError("transcript_unavailable", "The transcript was empty after cleaning.");
    }
    return { videoId, transcript, sourceUrl: watchUrl, title: extractPageTitle(page), provider: "youtube-captions" };
  } catch (error) {
    if (error instanceof YouTubeTranscriptError) throw error;
    throw new YouTubeTranscriptError("fetch_failed", "Could not load the YouTube transcript captions.");
  }
}

export function cleanTranscript(input: string) {
  return input
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\[(Music|Applause|Laughter|音楽|拍手).*?\]/gi, "")
    .trim()
    .slice(0, 14000);
}

function extractYouTubeVideoId(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) return url.pathname.replace("/", "").slice(0, 11);
    if (url.hostname.includes("youtube.com")) {
      const fromQuery = url.searchParams.get("v");
      if (fromQuery) return fromQuery.slice(0, 11);
      const shortsMatch = url.pathname.match(/\/shorts\/([^/?]+)/);
      if (shortsMatch?.[1]) return shortsMatch[1].slice(0, 11);
      const embedMatch = url.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch?.[1]) return embedMatch[1].slice(0, 11);
    }
  } catch {
    return "";
  }
  return "";
}

async function trySupadataTranscript(watchUrl: string, videoId: string): Promise<YouTubeTranscriptResult | null> {
  const apiKey = getSupadataApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(`https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(watchUrl)}`, {
      headers: {
        "x-api-key": apiKey,
        "user-agent": "lessonflow/1.0"
      },
      signal: AbortSignal.timeout(60000)
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      title?: string;
      content?: string | Array<{ text?: string }>;
    };
    const rawText = Array.isArray(data.content)
      ? data.content.map((item) => item.text || "").join(" ")
      : typeof data.content === "string"
        ? data.content
        : "";
    const transcript = cleanTranscript(rawText);
    if (!transcript) return null;

    return {
      videoId,
      transcript,
      sourceUrl: watchUrl,
      title: data.title || "YouTube Video",
      provider: "supadata"
    };
  } catch {
    return null;
  }
}

function getSupadataApiKey() {
  return process.env.SUPADATA_API_KEY || "";
}

function findCaptionTrackUrl(page: string) {
  const playerResponse = extractPlayerResponse(page);
  const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(tracks) || tracks.length === 0) return "";

  const preferred =
    tracks.find((track) => String(track.languageCode || "").startsWith("en") && !String(track.kind || "").includes("asr")) ||
    tracks.find((track) => String(track.languageCode || "").startsWith("en")) ||
    tracks[0];

  const baseUrl = String(preferred?.baseUrl || "");
  if (!baseUrl) return "";
  return baseUrl.includes("fmt=") ? baseUrl : `${baseUrl}&fmt=json3`;
}

function extractPlayerResponse(page: string): Record<string, any> | null {
  const marker = "ytInitialPlayerResponse = ";
  const start = page.indexOf(marker);
  if (start === -1) return null;
  const jsonStart = start + marker.length;
  const end = page.indexOf(";</script>", jsonStart);
  if (end === -1) return null;
  try {
    return JSON.parse(page.slice(jsonStart, end));
  } catch {
    return null;
  }
}

function extractPageTitle(page: string) {
  const match = page.match(/<title>(.*?)<\/title>/i);
  return match?.[1]?.replace(/ - YouTube$/i, "").trim() || "YouTube Video";
}

function parseTranscriptText(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { events?: Array<{ segs?: Array<{ utf8?: string }> }> };
    return (parsed.events || [])
      .flatMap((event) => event.segs || [])
      .map((segment) => segment.utf8 || "")
      .join(" ");
  } catch {
    return raw
      .replace(/<text[^>]*>/g, " ")
      .replace(/<\/text>/g, " ")
      .replace(/<[^>]+>/g, " ");
  }
}
