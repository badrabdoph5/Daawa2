import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { cleanPlayableAudioUrl, isYouTubeUrl, saveUploadedAudioFile } from "@/lib/audio-files";
import { prisma } from "@/lib/db";
import { createFileInvitation } from "@/lib/file-store";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { fallbackInvitationGallery, getInvitationGalleryEntries, saveInvitationGalleryImages } from "@/lib/invitation-images";
import { hashPassword } from "@/lib/password";
import { buildInvitationBaseSlug, makeNumberedInvitationSlug } from "@/lib/slug";
import { royalEnvelopeTemplate } from "@/lib/templates";
import { getTemplateSortOrderWithSettings, getTemplateWithSettings } from "@/lib/template-settings";
import { getRedirectUrl } from "@/lib/utils";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const groomName = String(formData.get("groomName") || "").trim();
  const brideName = String(formData.get("brideName") || "").trim();
  const groomEnglish = String(formData.get("groomEnglish") || groomName).trim();
  const brideEnglish = String(formData.get("brideEnglish") || brideName).trim();
  const phone = String(formData.get("phone") || "").trim();
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const weddingDate = String(formData.get("weddingDate") || "").trim();
  const weddingTime = String(formData.get("weddingTime") || "07:00 مساءً").trim();
  const venue = String(formData.get("venue") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const mapUrl = String(formData.get("mapUrl") || "").trim();
  const rawMusicUrl = String(formData.get("musicUrl") || "").trim();
  const uploadedAudio = formData.get("audioFile");
  const hasUploadedAudio = uploadedAudio instanceof File && uploadedAudio.size > 0;
  const templateSlug = String(formData.get("templateSlug") || royalEnvelopeTemplate.slug).trim();
  const selectedTemplate = (await getTemplateWithSettings(templateSlug)) || royalEnvelopeTemplate;
  const galleryImages = getInvitationGalleryEntries(formData);

  const parsedWeddingDate = new Date(weddingDate);
  if (!groomName || !brideName || !phone || !username || !password || !weddingDate || Number.isNaN(parsedWeddingDate.getTime()) || !venue) {
    return NextResponse.redirect(getRedirectUrl("/admin/client-invitations?error=missing", request.headers, request.nextUrl.origin), 303);
  }

  if (rawMusicUrl && isYouTubeUrl(rawMusicUrl)) {
    return NextResponse.redirect(getRedirectUrl("/admin/client-invitations?error=music", request.headers, request.nextUrl.origin), 303);
  }

  const savedGallery = await saveInvitationGalleryImages(galleryImages);
  if (galleryImages.length && !savedGallery.length) {
    console.error(`[Admin Invitation] Image save failed. Received ${galleryImages.length}, saved 0.`);
    return NextResponse.redirect(getRedirectUrl("/admin/client-invitations?error=images", request.headers, request.nextUrl.origin), 303);
  }
  const uploadedMusicUrl = await saveUploadedAudioFile(uploadedAudio instanceof File ? uploadedAudio : null);
  if (hasUploadedAudio && !uploadedMusicUrl) {
    return NextResponse.redirect(getRedirectUrl("/admin/client-invitations?error=music", request.headers, request.nextUrl.origin), 303);
  }
  const musicUrl = uploadedMusicUrl || cleanPlayableAudioUrl(rawMusicUrl);
  if (rawMusicUrl && !musicUrl) {
    return NextResponse.redirect(getRedirectUrl("/admin/client-invitations?error=music", request.headers, request.nextUrl.origin), 303);
  }
  const gallery = savedGallery.length ? savedGallery : fallbackInvitationGallery;
  console.log(`[Admin Invitation] Creating invitation with gallery (${gallery.length}):`, gallery);
  const baseSlug = buildInvitationBaseSlug(groomEnglish, brideEnglish);

  async function createFallbackInvitation() {
    const invitation = await createFileInvitation({
      baseSlug,
      templateSlug: selectedTemplate.slug,
      groomName,
      brideName,
      phone,
      username,
      password,
      weddingDate,
      weddingTime,
      venue,
      city,
      mapUrl,
      gallery,
      musicUrl,
      musicEnabled: Boolean(musicUrl),
    });
    console.log(`[Admin Invitation] File invitation ${invitation.code} saved with heroPhoto=${gallery[0]}.`);
    revalidatePath(`/${invitation.code}`);
    revalidatePath(`/${invitation.code}/ad_3399`);
    revalidatePath("/admin/client-invitations");
    queueGitHubSync(`Client invitation created: ${invitation.code}.`, { createSnapshot: true });
    return NextResponse.redirect(getRedirectUrl(`/admin/client-invitations?created=${invitation.code}&demo=1`, request.headers, request.nextUrl.origin), 303);
  }

  if (!prisma) {
    return createFallbackInvitation();
  }

  try {
    const existing = await prisma.invitation.findMany({
      where: { code: { startsWith: baseSlug } },
      select: { code: true },
    });
    const existingCodes = new Set(existing.map((item: { code: string }) => item.code));

    const template = await prisma.weddingTemplate.upsert({
      where: { slug: selectedTemplate.slug },
      update: {
        name: selectedTemplate.name,
        arabicName: selectedTemplate.arabicName,
        category: selectedTemplate.category,
        style: selectedTemplate.style,
        concept: selectedTemplate.concept,
        opening: selectedTemplate.opening,
        layout: selectedTemplate.layout,
        typography: selectedTemplate.typography,
        palette: selectedTemplate.palette,
        previewUrl: selectedTemplate.previewImage,
        enabled: selectedTemplate.enabled,
        sortOrder: await getTemplateSortOrderWithSettings(selectedTemplate.slug),
      },
      create: {
        slug: selectedTemplate.slug,
        name: selectedTemplate.name,
        arabicName: selectedTemplate.arabicName,
        category: selectedTemplate.category,
        style: selectedTemplate.style,
        concept: selectedTemplate.concept,
        opening: selectedTemplate.opening,
        layout: selectedTemplate.layout,
        typography: selectedTemplate.typography,
        palette: selectedTemplate.palette,
        previewUrl: selectedTemplate.previewImage,
        enabled: selectedTemplate.enabled,
        sortOrder: await getTemplateSortOrderWithSettings(selectedTemplate.slug),
      },
    });

    const customer = await prisma.customer.upsert({
      where: { username },
      update: {
        name: `${groomName} و ${brideName}`,
        phone,
        passwordHash: hashPassword(password),
        isActive: true,
      },
      create: {
        name: `${groomName} و ${brideName}`,
        phone,
        username,
        passwordHash: hashPassword(password),
        isActive: true,
      },
    });

    let code = "";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      code = makeNumberedInvitationSlug(baseSlug, Array.from(existingCodes));
      try {
        await prisma.invitation.create({
          data: {
            code,
            status: "ACTIVE",
            language: "ar",
            groomName,
            brideName,
            weddingDate: parsedWeddingDate,
            weddingTime,
            venue,
            city,
            mapUrl,
            heroPhoto: gallery[0],
            gallery,
            musicUrl,
            musicEnabled: Boolean(musicUrl),
            customerId: customer.id,
            templateId: template.id,
          },
        });
        break;
      } catch (error) {
        if (!isUniqueConstraintError(error) || attempt === 2) throw error;
        existingCodes.add(code);
      }
    }
    console.log(`[Admin Invitation] Database invitation ${code} saved with heroPhoto=${gallery[0]}.`);

    revalidatePath(`/${code}`);
    revalidatePath(`/${code}/ad_3399`);
    revalidatePath("/admin/client-invitations");
    queueGitHubSync(`Client invitation created: ${code}.`, { createSnapshot: true });
    return NextResponse.redirect(getRedirectUrl(`/admin/client-invitations?created=${code}`, request.headers, request.nextUrl.origin), 303);
  } catch (error) {
    console.error("Failed to create database invitation, falling back to file store", error);
    return createFallbackInvitation();
  }
}
