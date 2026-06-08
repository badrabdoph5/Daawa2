import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { getHomeContent, updateHomeContent, type HomeContent } from "@/lib/home-content";
import { getHomePreviewSettings, updateHomePreviewSettings } from "@/lib/preview-settings";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function cleanText(value: string) {
  return value.trim().slice(0, 500);
}

function makeItemId(prefix: string, text: string, existingIds: string[]) {
  const base =
    text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 42) || prefix;
  let candidate = base;
  let index = 2;
  while (existingIds.includes(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

function hasOwn<T extends object>(target: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function isPricingTextField(field: string): field is Exclude<keyof HomeContent["pricing"], "rows"> {
  return field === "eyebrow" || field === "title" || field === "invitationPlanName" || field === "invitationPrice" || field === "plusPlanName" || field === "plusPrice";
}

function updateTextContent(content: HomeContent, key: string, value: string) {
  const text = cleanText(value);
  const next = structuredClone(content);

  if (key.startsWith("hero.")) {
    const field = key.slice("hero.".length);
    if (!hasOwn(next.hero, field)) return null;
    next.hero[field] = text;
    return next;
  }

  if (key === "features.title") {
    next.features.title = text;
    return next;
  }

  if (key.startsWith("features.points.") && key.endsWith(".text")) {
    const id = key.replace(/^features\.points\./, "").replace(/\.text$/, "");
    const point = next.features.points.find((item) => item.id === id);
    if (!point) return null;
    point.text = text;
    return next;
  }

  if (key.startsWith("preview.")) {
    const field = key.slice("preview.".length);
    if (!hasOwn(next.preview, field)) return null;
    next.preview[field] = text;
    return next;
  }

  if (key.startsWith("pricing.") && !key.startsWith("pricing.rows.")) {
    const field = key.slice("pricing.".length);
    if (!isPricingTextField(field)) return null;
    next.pricing[field] = text;
    return next;
  }

  if (key.startsWith("pricing.rows.") && key.endsWith(".feature")) {
    const id = key.replace(/^pricing\.rows\./, "").replace(/\.feature$/, "");
    const row = next.pricing.rows.find((item) => item.id === id);
    if (!row) return null;
    row.feature = text;
    return next;
  }

  return null;
}

function inferPreviewMode(value: string) {
  const clean = value.trim().split("?")[0]?.toLowerCase() || "";
  if (/\.(mp4|webm|mov|m4v)$/.test(clean)) return "video";
  if (/\.(jpg|jpeg|png|webp|gif|svg)$/.test(clean)) return "image";
  return "template";
}

type BroadcastMutation = {
  action?: "text" | "media" | "addFeature" | "deleteFeature" | "addPricingRow" | "deletePricingRow" | "setPricingAvailability";
  key?: string;
  kind?: string;
  value?: string | boolean;
  text?: string;
  id?: string;
  feature?: string;
  invitation?: boolean;
  plus?: boolean;
  column?: "invitation" | "plus";
  mediaMode?: string;
  mediaUrl?: string;
  templateSlug?: string;
};

async function applyBroadcastMutation(payload: BroadcastMutation) {
  let content = await getHomeContent();
  let previewSettings = await getHomePreviewSettings();
  const action = payload.action || "text";

  if (action === "media" || ("kind" in payload && payload.kind === "media") || ("key" in payload && payload.key === "preview.media")) {
    const mediaUrl = String(("mediaUrl" in payload && payload.mediaUrl) || "").trim();
    const templateSlug = String(("templateSlug" in payload && payload.templateSlug) || previewSettings.templateSlug).trim();
    const requestedMode = String(("mediaMode" in payload && payload.mediaMode) || "");
    const mode = requestedMode === "image" || requestedMode === "video" || requestedMode === "template" ? requestedMode : inferPreviewMode(mediaUrl);

    previewSettings = await updateHomePreviewSettings({
      mode,
      templateSlug,
      mediaUrl,
      imageUrl: mode === "image" ? mediaUrl : previewSettings.imageUrl,
      videoUrl: mode === "video" ? mediaUrl : previewSettings.videoUrl,
    });
  } else if (action === "addFeature") {
    const text = cleanText(payload.text || "");
    if (!text) throw new Error("missing_feature_text");
    const next = structuredClone(content);
    next.features.points.push({
      id: makeItemId("feature", text, next.features.points.map((item) => item.id)),
      text,
    });
    content = await updateHomeContent(next);
  } else if (action === "deleteFeature") {
    const id = cleanText(payload.id || "");
    const next = structuredClone(content);
    next.features.points = next.features.points.filter((item) => item.id !== id);
    content = await updateHomeContent(next);
  } else if (action === "addPricingRow") {
    const feature = cleanText(payload.feature || "");
    if (!feature) throw new Error("missing_pricing_feature");
    const next = structuredClone(content);
    next.pricing.rows.push({
      id: makeItemId("pricing", feature, next.pricing.rows.map((item) => item.id)),
      feature,
      invitation: typeof payload.invitation === "boolean" ? payload.invitation : true,
      plus: typeof payload.plus === "boolean" ? payload.plus : true,
    });
    content = await updateHomeContent(next);
  } else if (action === "deletePricingRow") {
    const id = cleanText(payload.id || "");
    const next = structuredClone(content);
    next.pricing.rows = next.pricing.rows.filter((item) => item.id !== id);
    content = await updateHomeContent(next);
  } else if (action === "setPricingAvailability") {
    const id = cleanText(payload.id || "");
    const column = payload.column === "invitation" || payload.column === "plus" ? payload.column : "";
    if (!column) throw new Error("missing_pricing_column");
    const next = structuredClone(content);
    const row = next.pricing.rows.find((item) => item.id === id);
    if (!row) throw new Error("missing_pricing_row");
    row[column] = Boolean(payload.value);
    content = await updateHomeContent(next);
  } else {
    const key = "key" in payload ? String(payload.key || "") : "";
    if (!key) throw new Error("missing_key");
    const nextContent = updateTextContent(content, key, String(("value" in payload && payload.value) || ""));
    if (!nextContent) throw new Error("unknown_broadcast_key");
    content = await updateHomeContent(nextContent);
  }

  revalidatePath("/");
  revalidatePath("/admin/broadcast");
  queueGitHubSync(`Broadcast screen updated: ${action}.`, { createSnapshot: true });

  return { content, previewSettings };
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return jsonError("unauthorized", 401);
  }

  try {
    const payload = (await request.json()) as BroadcastMutation;
    const result = await applyBroadcastMutation(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "failed");
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const key = String(formData.get("key") || "");
  const kind = String(formData.get("kind") || "text");

  if (!key) {
    return NextResponse.redirect(getRedirectUrl("/admin/broadcast?error=missing", request.headers, request.nextUrl.origin), 303);
  }

  try {
    await applyBroadcastMutation(
      kind === "media" || key === "preview.media"
        ? {
            action: "media",
            mediaUrl: String(formData.get("mediaUrl") || ""),
            mediaMode: String(formData.get("mediaMode") || ""),
            templateSlug: String(formData.get("templateSlug") || ""),
          }
        : { action: "text", key, kind, value: String(formData.get("value") || "") },
    );
  } catch {
    return NextResponse.redirect(getRedirectUrl("/admin/broadcast?error=missing", request.headers, request.nextUrl.origin), 303);
  }

  const url = getRedirectUrl("/admin/broadcast", request.headers, request.nextUrl.origin);
  url.searchParams.set("saved", key);
  return NextResponse.redirect(url, 303);
}
