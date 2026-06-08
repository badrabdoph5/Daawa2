import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { cleanPlayableAudioUrl, saveAudioDataUrl } from "@/lib/audio-files";
import { prisma } from "@/lib/db";
import { createFileInvitation, getFileInvitationByCode, setFileInvitationActive, updateFileInvitation } from "@/lib/file-store";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { fallbackInvitationGallery, saveInvitationGalleryImages } from "@/lib/invitation-images";
import { normalizeInvitationTexts } from "@/lib/invitation-texts";
import { hashPassword } from "@/lib/password";
import { buildInvitationBaseSlug, getCustomerAdminPath, makeNumberedInvitationSlug } from "@/lib/slug";
import { getTemplateSortOrderWithSettings, getTemplateWithSettings } from "@/lib/template-settings";
import type { Invitation } from "@/lib/types";
import { getPublicSiteUrl } from "@/lib/utils";

export const runtime = "nodejs";

type BuilderPayload = {
  action?: "draft" | "publish";
  code?: string;
  templateSlug?: string;
  groomName?: string;
  brideName?: string;
  weddingDate?: string;
  weddingTime?: string;
  venue?: string;
  city?: string;
  mapUrl?: string;
  gallery?: string[];
  musicEnabled?: boolean;
  musicUrl?: string;
  musicDataUrl?: string;
  texts?: Invitation["texts"];
  photographer?: {
    enabled?: boolean;
    name?: string;
    logoUrl?: string;
    logoDataUrl?: string;
    facebookUrl?: string;
    instagramUrl?: string;
  };
};

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 160) : fallback;
}

function cleanUrl(value: unknown) {
  const clean = cleanText(value);
  if (!clean) return "";
  try {
    const url = new URL(clean);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function resolveMusic(payload: BuilderPayload) {
  if (!payload.musicEnabled) return "";
  const uploaded = payload.musicDataUrl ? await saveAudioDataUrl(payload.musicDataUrl) : "";
  if (uploaded) return uploaded;
  return cleanPlayableAudioUrl(payload.musicUrl || "");
}

async function resolvePhotographer(payload: BuilderPayload) {
  const input = payload.photographer;
  if (!input?.enabled) return { enabled: false, name: "", logoUrl: "", facebookUrl: "", instagramUrl: "" };
  const logoGallery = input.logoDataUrl ? await saveInvitationGalleryImages([input.logoDataUrl]) : [];
  return {
    enabled: true,
    name: cleanText(input.name, "المصور الفوتوغرافي"),
    logoUrl: logoGallery[0] || cleanText(input.logoUrl),
    facebookUrl: cleanUrl(input.facebookUrl) || "https://www.facebook.com/",
    instagramUrl: cleanUrl(input.instagramUrl) || "https://www.instagram.com/",
  };
}

function responseLinks(request: NextRequest, code: string) {
  const siteUrl = getPublicSiteUrl(request.headers).replace(/\/$/, "");
  return {
    publicUrl: `${siteUrl}/${code}`,
    adminUrl: `${siteUrl}${getCustomerAdminPath(code)}`,
  };
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "انتهت جلسة الأدمن. سجل الدخول مرة أخرى." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as BuilderPayload | null;
  if (!payload) return NextResponse.json({ error: "بيانات غير صالحة." }, { status: 400 });
  const input = payload;

  const action = input.action === "draft" ? "draft" : "publish";
  const groomName = cleanText(input.groomName);
  const brideName = cleanText(input.brideName);
  const weddingDate = cleanText(input.weddingDate);
  const venue = cleanText(input.venue);
  const templateSlug = cleanText(input.templateSlug, "featured-1");
  const parsedDate = normalizeDate(weddingDate);

  if (!groomName || !brideName || !parsedDate || !venue) {
    return NextResponse.json({ error: "اكتب اسم العريس واسم العروسة والتاريخ والعنوان قبل الحفظ." }, { status: 400 });
  }

  const selectedTemplate = await getTemplateWithSettings(templateSlug);
  if (!selectedTemplate) return NextResponse.json({ error: "القالب المختار غير موجود." }, { status: 400 });
  const templateDefinition = selectedTemplate;
  const safeWeddingDate: Date = parsedDate;

  const galleryInput = Array.isArray(input.gallery) ? input.gallery.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, 3) : [];
  const savedGallery = await saveInvitationGalleryImages(galleryInput);
  const gallery = savedGallery.length ? savedGallery : fallbackInvitationGallery;
  const musicUrl = await resolveMusic(input);
  if (input.musicEnabled && (input.musicDataUrl || input.musicUrl) && !musicUrl) {
    return NextResponse.json({ error: "ملف أو رابط الموسيقى غير قابل للتشغيل." }, { status: 400 });
  }
  const photographer = await resolvePhotographer(input);
  const texts = normalizeInvitationTexts(input.texts);
  const status: "ACTIVE" | "DRAFT" = action === "publish" ? "ACTIVE" : "DRAFT";
  const isActive = status === "ACTIVE";
  const baseSlug = buildInvitationBaseSlug(groomName, brideName);
  const existingCode = cleanText(input.code);

  async function createOrUpdateFileInvitation() {
    if (existingCode && (await getFileInvitationByCode(existingCode))) {
      await updateFileInvitation(existingCode, {
        templateSlug: templateDefinition.slug,
        groomName,
        brideName,
        weddingDate,
        weddingTime: cleanText(input.weddingTime, "07:00 مساءً"),
        venue,
        city: cleanText(input.city),
        mapUrl: cleanText(input.mapUrl),
        gallery,
        heroPhoto: gallery[0],
        musicUrl,
        musicEnabled: Boolean(input.musicEnabled),
        texts,
        photographer,
        isActive,
      });
      return existingCode;
    }

    const storeInvitation = await createFileInvitation({
      baseSlug,
      templateSlug: templateDefinition.slug,
      groomName,
      brideName,
      phone: "",
      username: `client_${Date.now().toString(36)}`,
      password: `bd-${Date.now().toString(36)}`,
      weddingDate,
      weddingTime: cleanText(input.weddingTime, "07:00 مساءً"),
      venue,
      city: cleanText(input.city),
      mapUrl: cleanText(input.mapUrl),
      gallery,
      musicUrl,
      musicEnabled: Boolean(input.musicEnabled),
      texts,
      photographer,
    });
    if (!isActive) await setFileInvitationActive(storeInvitation.code, false);
    return storeInvitation.code;
  }

  async function createOrUpdatePrismaInvitation() {
    if (!prisma) return null;
    const template = await prisma.weddingTemplate.upsert({
      where: { slug: templateDefinition.slug },
      update: {
        name: templateDefinition.name,
        arabicName: templateDefinition.arabicName,
        category: templateDefinition.category,
        style: templateDefinition.style,
        concept: templateDefinition.concept,
        opening: templateDefinition.opening,
        layout: templateDefinition.layout,
        typography: templateDefinition.typography,
        palette: templateDefinition.palette,
        previewUrl: templateDefinition.previewImage,
        enabled: templateDefinition.enabled,
        sortOrder: await getTemplateSortOrderWithSettings(templateDefinition.slug),
      },
      create: {
        slug: templateDefinition.slug,
        name: templateDefinition.name,
        arabicName: templateDefinition.arabicName,
        category: templateDefinition.category,
        style: templateDefinition.style,
        concept: templateDefinition.concept,
        opening: templateDefinition.opening,
        layout: templateDefinition.layout,
        typography: templateDefinition.typography,
        palette: templateDefinition.palette,
        previewUrl: templateDefinition.previewImage,
        enabled: templateDefinition.enabled,
        sortOrder: await getTemplateSortOrderWithSettings(templateDefinition.slug),
      },
    });

    const existing = existingCode
      ? await prisma.invitation.findUnique({ where: { code: existingCode }, select: { code: true, customerId: true } }).catch(() => null)
      : null;
    const code =
      existing?.code ||
      makeNumberedInvitationSlug(
        baseSlug,
        (await prisma.invitation.findMany({ where: { code: { startsWith: baseSlug } }, select: { code: true } })).map((item) => item.code),
      );

    const username = `client_${code.replace(/[^a-z0-9]+/gi, "_")}`;
    const customer = await prisma.customer.upsert({
      where: { username },
      update: {
        name: `${groomName} و ${brideName}`,
        phone: "",
        passwordHash: hashPassword(`${code}-admin`),
        isActive: true,
      },
      create: {
        name: `${groomName} و ${brideName}`,
        phone: "",
        username,
        passwordHash: hashPassword(`${code}-admin`),
        isActive: true,
      },
    });

    const data = {
      status,
      language: "ar",
      groomName,
      brideName,
      weddingDate: safeWeddingDate,
      weddingTime: cleanText(input.weddingTime, "07:00 مساءً"),
      venue,
      city: cleanText(input.city),
      mapUrl: cleanText(input.mapUrl),
      heroPhoto: gallery[0],
      gallery,
      musicUrl,
      musicEnabled: Boolean(input.musicEnabled),
      texts,
      photographer,
      customerId: customer.id,
      templateId: template.id,
    };

    if (existing?.code) {
      await prisma.invitation.update({ where: { code: existing.code }, data });
      return existing.code;
    }

    await prisma.invitation.create({ data: { code, ...data } });
    return code;
  }

  const code = (await createOrUpdatePrismaInvitation()) || (await createOrUpdateFileInvitation());
  revalidatePath(`/${code}`);
  revalidatePath(getCustomerAdminPath(code));
  revalidatePath("/admin/client-invitations");
  queueGitHubSync(`Invitation builder ${action}: ${code}.`, { createSnapshot: true });

  return NextResponse.json({
    ok: true,
    status,
    code,
    ...responseLinks(request, code),
  });
}
