import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAdminInvitations } from "@/lib/admin-data";
import { cleanPlayableAudioUrl, deleteUploadedMusicFile, isYouTubeUrl, saveUploadedAudioFile } from "@/lib/audio-files";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { deleteMusicSlot, getMusicLibrary, saveMusicSlot, setMusicSlotEnabled } from "@/lib/music-library";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

async function revalidateMusicPages(templateSlugs: string[]) {
  revalidatePath("/admin/music");
  revalidatePath("/admin/templates");
  revalidatePath("/templates");
  for (const slug of templateSlugs) {
    revalidatePath(`/templates/${slug}/preview`);
  }

  const invitations = await getAdminInvitations().catch(() => []);
  for (const invitation of invitations) {
    revalidatePath(`/${invitation.code}`);
    revalidatePath(`/${invitation.code}/ad_3399`);
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const [templates, library] = await Promise.all([getTemplatesWithSettings(), getMusicLibrary()]);
  const allTemplateSlugs = templates.filter((template) => template.enabled).map((template) => template.slug);
  const slotId = String(formData.get("slotId") || "global-track");
  const currentSlot = library.slots.find((slot) => slot.id === slotId);
  const action = String(formData.get("action") || "save");
  const trackName = String(formData.get("trackName") || "");
  const trackEnabled = action === "enable" || (action === "save" && formData.get("trackEnabled") === "on");
  const uploadedFile = formData.get("audioFile");
  const requestedAudioUrl = String(formData.get("audioUrl") || "").trim();
  const url = getRedirectUrl("/admin/music", request.headers, request.nextUrl.origin);
  const trimmedTrackName = trackName.trim();

  if (action !== "save" && !currentSlot) {
    url.searchParams.set("error", "slot");
    return NextResponse.redirect(url, 303);
  }

  if (action === "disable") {
    const savedSlot = await setMusicSlotEnabled(slotId, false);
    await revalidateMusicPages(allTemplateSlugs);
    queueGitHubSync(`Global music disabled: ${savedSlot?.id || slotId}.`, { createSnapshot: true });
    url.searchParams.set("saved", "disabled");
    url.searchParams.set("count", String(allTemplateSlugs.length));
    return NextResponse.redirect(url, 303);
  }

  if (action === "enable") {
    if (!currentSlot) {
      url.searchParams.set("error", "slot");
      return NextResponse.redirect(url, 303);
    }
    if (!currentSlot.url) {
      url.searchParams.set("error", "audio");
      return NextResponse.redirect(url, 303);
    }
    const savedSlot = await setMusicSlotEnabled(slotId, true);
    await revalidateMusicPages(allTemplateSlugs);
    queueGitHubSync(`Global music enabled: ${savedSlot?.id || slotId}.`, { createSnapshot: true });
    url.searchParams.set("saved", "enabled");
    url.searchParams.set("count", String(allTemplateSlugs.length));
    return NextResponse.redirect(url, 303);
  }

  if (action === "clear" || action === "delete") {
    if (!currentSlot) {
      url.searchParams.set("error", "slot");
      return NextResponse.redirect(url, 303);
    }
    await deleteUploadedMusicFile(currentSlot.url);
    const savedSlot = await deleteMusicSlot(slotId);
    await revalidateMusicPages(allTemplateSlugs);
    queueGitHubSync(`Global music cleared: ${savedSlot?.id || slotId}.`, { createSnapshot: true });
    url.searchParams.set("saved", "cleared");
    url.searchParams.set("count", String(allTemplateSlugs.length));
    return NextResponse.redirect(url, 303);
  }

  if (requestedAudioUrl && isYouTubeUrl(requestedAudioUrl)) {
    url.searchParams.set("error", "youtube");
    return NextResponse.redirect(url, 303);
  }

  if (!trimmedTrackName) {
    url.searchParams.set("error", "name");
    return NextResponse.redirect(url, 303);
  }

  const normalizedTrackName = trimmedTrackName.toLocaleLowerCase("ar-EG");
  const targetSlot = library.slots.find((slot) => slot.name.trim().toLocaleLowerCase("ar-EG") === normalizedTrackName);
  const replacingExistingUrl = targetSlot?.url || "";
  const hasUploadedFile = uploadedFile instanceof File && uploadedFile.size > 0;

  if (!targetSlot && !hasUploadedFile && !requestedAudioUrl) {
    url.searchParams.set("error", "audio");
    return NextResponse.redirect(url, 303);
  }

  const uploadedUrl = await saveUploadedAudioFile(hasUploadedFile ? uploadedFile : null, replacingExistingUrl);
  const directUrl = cleanPlayableAudioUrl(requestedAudioUrl);
  const isReplacingWithDirectUrl = Boolean(directUrl && replacingExistingUrl && directUrl !== replacingExistingUrl);
  const audioUrl = uploadedUrl || directUrl || cleanPlayableAudioUrl(replacingExistingUrl) || "";

  if ((hasUploadedFile && !uploadedUrl) || (requestedAudioUrl && !directUrl)) {
    url.searchParams.set("error", "audio");
    return NextResponse.redirect(url, 303);
  }

  if (isReplacingWithDirectUrl) {
    await deleteUploadedMusicFile(replacingExistingUrl);
  }

  if (trackEnabled && !audioUrl) {
    url.searchParams.set("error", trackEnabled && !audioUrl ? "audio" : "slot");
    return NextResponse.redirect(url, 303);
  }

  const appliedTemplateSlugs = allTemplateSlugs;

  const savedSlot = await saveMusicSlot({
    id: targetSlot?.id,
    name: trimmedTrackName,
    url: audioUrl,
    enabled: trackEnabled,
  });

  if (savedSlot) {
    await revalidateMusicPages(appliedTemplateSlugs);
    queueGitHubSync(`Music slot ${savedSlot.id} ${trackEnabled ? "enabled" : "disabled"} for ${appliedTemplateSlugs.length} template(s).`, { createSnapshot: true });
  }

  if (!savedSlot) url.searchParams.set("error", "slot");
  else url.searchParams.set("saved", savedSlot.id);
  url.searchParams.set("count", String(appliedTemplateSlugs.length));
  return NextResponse.redirect(url, 303);
}
