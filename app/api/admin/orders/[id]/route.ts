import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { cleanPlayableAudioUrl, saveAudioDataUrl } from "@/lib/audio-files";
import { prisma } from "@/lib/db";
import { createFileInvitation, deleteFileOrder, getFileOrder, updateFileOrder } from "@/lib/file-store";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { fallbackInvitationGallery, saveInvitationGalleryImages } from "@/lib/invitation-images";
import { normalizeInvitationTexts } from "@/lib/invitation-texts";
import { hashPassword } from "@/lib/password";
import { buildInvitationBaseSlug, getCustomerAdminPath, makeNumberedInvitationSlug } from "@/lib/slug";
import { getTemplateSortOrderWithSettings, getTemplateWithSettings } from "@/lib/template-settings";
import type { Invitation, OrderRequest } from "@/lib/types";
import { getPublicSiteUrl, getRedirectUrl, normalizeInternalAssetUrl } from "@/lib/utils";
import { validateOrderUpdate } from "@/lib/validation-enhanced";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AdminOrderPayload = {
  action?: "review" | "update" | "publish" | "reject" | "delete";
  groomName?: string;
  brideName?: string;
  phone?: string;
  weddingDate?: string;
  venue?: string;
  mapUrl?: string;
  notes?: string;
  templateSlug?: string;
  imageUrls?: string[];
  musicEnabled?: boolean;
  musicChoice?: "default" | "upload" | "url";
  musicUrl?: string;
  musicDataUrl?: string;
  texts?: Invitation["texts"];
  photographer?: Invitation["photographer"];
  rejectionReason?: string;
};

type AdminOrderSnapshot = OrderRequest & {
  publicUrl?: string;
  adminUrl?: string;
};

const fallbackGallery = fallbackInvitationGallery;

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function wantsJson(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  const accept = request.headers.get("accept") || "";
  return contentType.includes("application/json") || accept.includes("application/json");
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function redirectBack(request: NextRequest, status: string) {
  const url = getRedirectUrl("/admin/orders", request.headers, request.nextUrl.origin);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url, 303);
}

function cleanText(value: unknown, fallback = "", limit = 500) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : fallback;
}

function cleanOptionalUrl(value: unknown) {
  const text = cleanText(value, "", 500);
  if (!text) return "";
  if (text.startsWith("/uploads/") || text.startsWith("/assets/")) return normalizeInternalAssetUrl(text) || "";
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function cleanDate(value: unknown) {
  const text = cleanText(value, "", 40);
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateToString(value: Date | string | null | undefined) {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : value;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeStatus(status: string): OrderRequest["status"] {
  const clean = status.toLowerCase();
  if (clean === "accepted") return "reviewing";
  if (clean === "converted") return "published";
  if (["new", "reviewing", "edited", "published", "rejected"].includes(clean)) return clean as OrderRequest["status"];
  return "new";
}

function parseStoredImageUrls(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").map((item) => normalizeInternalAssetUrl(item) || item).filter(Boolean).slice(0, 3);
  if (typeof value === "string") {
    try {
      return parseStoredImageUrls(JSON.parse(value) as unknown);
    } catch {
      return [];
    }
  }
  return [];
}

function cleanImageList(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const item of value) {
    const url = cleanOptionalUrl(item);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls.slice(0, 3);
}

function cleanPhotographer(value: unknown): Invitation["photographer"] | undefined {
  if (!value || typeof value !== "object") return { enabled: false, name: "", facebookUrl: "", instagramUrl: "" };
  const input = value as Record<string, unknown>;
  const enabled = input.enabled === true;
  return {
    enabled,
    name: enabled ? cleanText(input.name, "المصور الفوتوغرافي", 120) : "",
    logoUrl: enabled ? cleanOptionalUrl(input.logoUrl) || undefined : undefined,
    facebookUrl: enabled ? cleanOptionalUrl(input.facebookUrl) || "https://www.facebook.com/" : "",
    instagramUrl: enabled ? cleanOptionalUrl(input.instagramUrl) || "https://www.instagram.com/" : "",
  };
}

async function resolveMusic(payload: AdminOrderPayload, existingUrl?: string | null) {
  if (!payload.musicEnabled) return "";
  if (payload.musicChoice === "default") return "";
  if (payload.musicDataUrl) {
    const uploaded = await saveAudioDataUrl(payload.musicDataUrl, existingUrl);
    if (uploaded) return uploaded;
  }
  return cleanPlayableAudioUrl(payload.musicUrl || existingUrl || "");
}

function responseLinks(request: NextRequest, code: string) {
  const siteUrl = getPublicSiteUrl(request.headers).replace(/\/$/, "");
  return {
    publicUrl: `${siteUrl}/${code}`,
    adminUrl: `${siteUrl}${getCustomerAdminPath(code)}`,
  };
}

function getOrderDraft(payload: AdminOrderPayload, existing?: Partial<OrderRequest> | null) {
  const groomName = cleanText(payload.groomName, existing?.groomName || "", 120);
  const brideName = cleanText(payload.brideName, existing?.brideName || "", 120);
  const phone = cleanText(payload.phone, existing?.phone || "", 60);
  const weddingDateText = cleanText(payload.weddingDate, existing?.weddingDate || "", 60);
  const weddingDate = cleanDate(weddingDateText);
  const venue = cleanText(payload.venue, existing?.venue || "يحدد لاحقًا", 240);
  const mapUrl = cleanOptionalUrl(payload.mapUrl ?? existing?.mapUrl ?? "");
  const notes = cleanText(payload.notes, existing?.notes || "", 1500);
  const templateSlug = cleanText(payload.templateSlug, existing?.templateSlug || "featured-1", 140);
  const images = cleanImageList(payload.imageUrls).length ? cleanImageList(payload.imageUrls) : existing?.imageUrls || [];
  const musicChoice = payload.musicChoice === "upload" || payload.musicChoice === "url" || payload.musicChoice === "default" ? payload.musicChoice : existing?.musicChoice || "default";
  return {
    groomName,
    brideName,
    phone,
    weddingDateText,
    weddingDate,
    venue,
    mapUrl,
    notes,
    templateSlug,
    imageUrls: images.slice(0, 3),
    musicEnabled: payload.musicEnabled ?? existing?.musicEnabled ?? false,
    musicChoice,
    musicUrl: cleanText(payload.musicUrl, existing?.musicUrl || "", 500),
    texts: normalizeInvitationTexts(payload.texts ?? existing?.texts),
    photographer: cleanPhotographer(payload.photographer ?? existing?.photographer),
    rejectionReason: cleanText(payload.rejectionReason, existing?.rejectionReason || "", 500),
  };
}

function validateDraft(draft: ReturnType<typeof getOrderDraft>) {
  const validation = validateOrderUpdate({
    groomName: draft.groomName,
    brideName: draft.brideName,
    phone: draft.phone,
    weddingDate: draft.weddingDateText,
    venue: draft.venue,
    mapUrl: draft.mapUrl,
    notes: draft.notes,
    templateSlug: draft.templateSlug,
  });
  if (!validation.success) return validation.error;
  if (!draft.weddingDate) return "تاريخ المناسبة غير صالح.";
  return "";
}

function serializeFileOrder(order: OrderRequest, request: NextRequest): AdminOrderSnapshot {
  return {
    ...order,
    status: normalizeStatus(order.status),
    imageUrls: (order.imageUrls || []).slice(0, 3),
    ...(order.publishedInvitationCode ? responseLinks(request, order.publishedInvitationCode) : {}),
  };
}

async function serializePrismaOrder(id: string, request: NextRequest): Promise<AdminOrderSnapshot | null> {
  if (!prisma) return null;
  const order = await prisma.orderRequest.findUnique({
    where: { id },
    include: { template: { select: { slug: true } } },
  });
  if (!order) return null;
  const snapshot: AdminOrderSnapshot = {
    id: order.id,
    orderNumber: order.orderNumber || undefined,
    dedupeKey: order.dedupeKey || undefined,
    groomName: order.groomName,
    brideName: order.brideName,
    phone: order.phone,
    weddingDate: dateToString(order.weddingDate),
    venue: order.venue,
    mapUrl: order.mapUrl || undefined,
    notes: order.notes || undefined,
    imageUrls: parseStoredImageUrls(order.imageUrls),
    musicEnabled: order.musicEnabled,
    musicChoice: order.musicChoice === "upload" || order.musicChoice === "url" || order.musicChoice === "default" ? order.musicChoice : "default",
    musicUrl: order.musicUrl || undefined,
    texts: normalizeInvitationTexts(order.texts),
    photographer: cleanPhotographer(order.photographer),
    rejectionReason: order.rejectionReason || undefined,
    publishedInvitationCode: order.publishedInvitationCode || undefined,
    templateSlug: order.template?.slug || "featured-1",
    language: order.language === "en" ? "en" : "ar",
    status: normalizeStatus(String(order.status || "NEW")),
    submittedAt: dateToString(order.submittedAt),
    createdAt: dateToString(order.createdAt),
    ...(order.publishedInvitationCode ? responseLinks(request, order.publishedInvitationCode) : {}),
  };
  return snapshot;
}

async function upsertTemplate(templateSlug: string) {
  const selectedTemplate = await getTemplateWithSettings(templateSlug);
  if (!selectedTemplate) return null;
  if (!prisma) return { definition: selectedTemplate, dbTemplate: null };
  const dbTemplate = await prisma.weddingTemplate.upsert({
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
    select: { id: true },
  });
  return { definition: selectedTemplate, dbTemplate };
}

async function publishFileOrder(id: string, payload: AdminOrderPayload) {
  const order = await getFileOrder(id);
  if (!order) return null;
  const draft = getOrderDraft(payload, order);
  const error = validateDraft(draft);
  if (error) throw new Error(error);
  const gallery = (await saveInvitationGalleryImages(draft.imageUrls)).slice(0, 3);
  const musicUrl = await resolveMusic(payload, order.musicUrl);
  const digits = digitsOnly(draft.phone);
  const username = `client_${digits || order.id.replace(/[^a-z0-9]/gi, "_").slice(0, 18)}`;
  const password = digits.slice(-6) || order.id.slice(-6) || "123456";
  const invitation = await createFileInvitation({
    baseSlug: buildInvitationBaseSlug(draft.groomName, draft.brideName),
    templateSlug: draft.templateSlug,
    groomName: draft.groomName,
    brideName: draft.brideName,
    phone: draft.phone,
    username,
    password,
    weddingDate: draft.weddingDateText,
    weddingTime: "07:00 مساءً",
    venue: draft.venue,
    city: "",
    mapUrl: draft.mapUrl,
    gallery: gallery.length ? gallery : fallbackGallery,
    musicUrl,
    musicEnabled: Boolean(draft.musicEnabled),
    texts: draft.texts,
    photographer: draft.photographer,
  });
  await updateFileOrder(id, {
    groomName: draft.groomName,
    brideName: draft.brideName,
    phone: draft.phone,
    weddingDate: draft.weddingDateText,
    venue: draft.venue,
    mapUrl: draft.mapUrl,
    notes: draft.notes,
    imageUrls: gallery.length ? gallery : fallbackGallery,
    templateSlug: draft.templateSlug,
    musicEnabled: Boolean(draft.musicEnabled),
    musicChoice: draft.musicChoice,
    musicUrl,
    texts: draft.texts,
    photographer: draft.photographer,
    status: "published",
    publishedInvitationCode: invitation.code,
  });
  return invitation.code;
}

async function publishPrismaOrder(id: string, payload: AdminOrderPayload) {
  if (!prisma) return null;
  const order = await prisma.orderRequest.findUnique({
    where: { id },
    include: { template: { select: { slug: true } } },
  });
  if (!order) return null;
  const existingOrder: Partial<OrderRequest> = {
    groomName: order.groomName,
    brideName: order.brideName,
    phone: order.phone,
    weddingDate: dateToString(order.weddingDate),
    venue: order.venue,
    mapUrl: order.mapUrl || undefined,
    notes: order.notes || undefined,
    imageUrls: parseStoredImageUrls(order.imageUrls),
    musicEnabled: order.musicEnabled,
    musicChoice: order.musicChoice === "upload" || order.musicChoice === "url" || order.musicChoice === "default" ? order.musicChoice : "default",
    musicUrl: order.musicUrl || undefined,
    texts: normalizeInvitationTexts(order.texts),
    photographer: cleanPhotographer(order.photographer),
    rejectionReason: order.rejectionReason || undefined,
    templateSlug: order.template?.slug || "featured-1",
  };
  const draft = getOrderDraft(payload, existingOrder);
  const error = validateDraft(draft);
  if (error) throw new Error(error);
  const weddingDate = draft.weddingDate || new Date();
  const template = await upsertTemplate(draft.templateSlug);
  if (!template?.dbTemplate) throw new Error("القالب المختار غير موجود.");

  const gallery = (await saveInvitationGalleryImages(draft.imageUrls)).slice(0, 3);
  const finalGallery = gallery.length ? gallery : fallbackGallery;
  const musicUrl = await resolveMusic(payload, order.musicUrl);
  const baseSlug = buildInvitationBaseSlug(draft.groomName, draft.brideName);
  const publishedCode = order.publishedInvitationCode || "";
  const existingPublishedInvitation = publishedCode ? await prisma.invitation.findUnique({ where: { code: publishedCode }, select: { code: true } }).catch(() => null) : null;
  const existingCodes = existingPublishedInvitation ? [] : await prisma.invitation.findMany({ where: { code: { startsWith: baseSlug } }, select: { code: true } });
  const code =
    existingPublishedInvitation?.code ||
    makeNumberedInvitationSlug(
      baseSlug,
      existingCodes.map((item) => item.code),
    );
  const digits = digitsOnly(draft.phone);
  const username = `client_${digits || code.replace(/[^a-z0-9]/gi, "_")}`;
  const password = digits.slice(-6) || code.slice(-6) || "123456";
  const customer = await prisma.customer.upsert({
    where: { username },
    update: {
      name: `${draft.groomName} و ${draft.brideName}`,
      phone: draft.phone,
      passwordHash: hashPassword(password),
      isActive: true,
    },
    create: {
      name: `${draft.groomName} و ${draft.brideName}`,
      phone: draft.phone,
      username,
      passwordHash: hashPassword(password),
      isActive: true,
    },
  });

  const invitationData = {
    status: "ACTIVE" as never,
    language: order.language,
    groomName: draft.groomName,
    brideName: draft.brideName,
    weddingDate,
    weddingTime: "07:00 مساءً",
    venue: draft.venue,
    city: "",
    mapUrl: draft.mapUrl,
    heroPhoto: finalGallery[0],
    gallery: finalGallery,
    musicUrl: musicUrl || undefined,
    musicEnabled: Boolean(draft.musicEnabled),
    texts: draft.texts,
    photographer: draft.photographer,
    customerId: customer.id,
    templateId: template.dbTemplate.id,
  };

  if (existingPublishedInvitation) {
    await prisma.invitation.update({ where: { code }, data: invitationData });
  } else {
    await prisma.invitation.create({ data: { code, ...invitationData } });
  }

  await prisma.orderRequest.update({
    where: { id },
    data: {
      groomName: draft.groomName,
      brideName: draft.brideName,
      phone: draft.phone,
      weddingDate,
      venue: draft.venue,
      mapUrl: draft.mapUrl,
      notes: draft.notes,
      imageUrls: finalGallery,
      musicEnabled: Boolean(draft.musicEnabled),
      musicChoice: draft.musicChoice,
      musicUrl,
      texts: draft.texts,
      photographer: draft.photographer,
      status: "PUBLISHED" as never,
      publishedInvitationCode: code,
      rejectionReason: null,
      customerId: customer.id,
      templateId: template.dbTemplate.id,
    },
  });
  return code;
}

async function updateOrder(id: string, payload: AdminOrderPayload, status: "REVIEWING" | "EDITED" | "REJECTED" | null) {
  const fileOrder = await getFileOrder(id);
  const existingFile: Partial<OrderRequest> | null = fileOrder || null;
  const existingPrisma = prisma
    ? await prisma.orderRequest.findUnique({ where: { id }, include: { template: { select: { slug: true } } } }).catch(() => null)
    : null;
  const existingOrder: Partial<OrderRequest> | null = existingPrisma
    ? {
        groomName: existingPrisma.groomName,
        brideName: existingPrisma.brideName,
        phone: existingPrisma.phone,
        weddingDate: dateToString(existingPrisma.weddingDate),
        venue: existingPrisma.venue,
        mapUrl: existingPrisma.mapUrl || undefined,
        notes: existingPrisma.notes || undefined,
        imageUrls: parseStoredImageUrls(existingPrisma.imageUrls),
        musicEnabled: existingPrisma.musicEnabled,
        musicChoice: existingPrisma.musicChoice === "upload" || existingPrisma.musicChoice === "url" || existingPrisma.musicChoice === "default" ? existingPrisma.musicChoice : "default",
        musicUrl: existingPrisma.musicUrl || undefined,
        texts: normalizeInvitationTexts(existingPrisma.texts),
        photographer: cleanPhotographer(existingPrisma.photographer),
        rejectionReason: existingPrisma.rejectionReason || undefined,
        templateSlug: existingPrisma.template?.slug || "featured-1",
      }
    : existingFile;
  if (!existingOrder) return null;
  const draft = getOrderDraft(payload, existingOrder);
  const error = status === "REVIEWING" ? "" : validateDraft(draft);
  if (error) throw new Error(error);
  const musicUrl = await resolveMusic(payload, existingOrder.musicUrl);

  if (existingPrisma && prisma) {
    const template = draft.templateSlug ? await upsertTemplate(draft.templateSlug) : null;
    await prisma.orderRequest.update({
      where: { id },
      data: {
        groomName: draft.groomName,
        brideName: draft.brideName,
        phone: draft.phone,
        weddingDate: draft.weddingDate || new Date(),
        venue: draft.venue,
        mapUrl: draft.mapUrl,
        notes: draft.notes,
        imageUrls: draft.imageUrls,
        musicEnabled: Boolean(draft.musicEnabled),
        musicChoice: draft.musicChoice,
        musicUrl,
        texts: draft.texts,
        photographer: draft.photographer,
        ...(status ? { status: status as never } : {}),
        ...(status === "REJECTED" ? { rejectionReason: draft.rejectionReason || "تم رفض الطلب من لوحة الإدارة." } : { rejectionReason: null }),
        ...(template?.dbTemplate ? { templateId: template.dbTemplate.id } : {}),
      },
    });
    return true;
  }

  const fileStatus = status === "REVIEWING" ? "reviewing" : status === "REJECTED" ? "rejected" : status === "EDITED" ? "edited" : undefined;
  await updateFileOrder(id, {
    groomName: draft.groomName,
    brideName: draft.brideName,
    phone: draft.phone,
    weddingDate: draft.weddingDateText,
    venue: draft.venue,
    mapUrl: draft.mapUrl,
    notes: draft.notes,
    imageUrls: draft.imageUrls,
    templateSlug: draft.templateSlug,
    musicEnabled: Boolean(draft.musicEnabled),
    musicChoice: draft.musicChoice,
    musicUrl,
    texts: draft.texts,
    photographer: draft.photographer,
    rejectionReason: status === "REJECTED" ? draft.rejectionReason || "تم رفض الطلب من لوحة الإدارة." : undefined,
    ...(fileStatus ? { status: fileStatus as OrderRequest["status"] } : {}),
  });
  return getFileOrder(id);
}

async function getSnapshot(id: string, request: NextRequest) {
  const dbOrder = prisma ? await serializePrismaOrder(id, request).catch(() => null) : null;
  if (dbOrder) return dbOrder;
  const fileOrder = await getFileOrder(id);
  return fileOrder ? serializeFileOrder(fileOrder, request) : null;
}

function payloadFromForm(formData: FormData): AdminOrderPayload {
  const action = String(formData.get("action") || "");
  return {
    action: action === "accept" ? "review" : action === "convert" ? "publish" : action === "delete" || action === "reject" || action === "update" ? action : "update",
    groomName: String(formData.get("groomName") || ""),
    brideName: String(formData.get("brideName") || ""),
    phone: String(formData.get("phone") || ""),
    weddingDate: String(formData.get("weddingDate") || ""),
    venue: String(formData.get("venue") || ""),
    mapUrl: String(formData.get("mapUrl") || ""),
    notes: String(formData.get("notes") || ""),
    templateSlug: String(formData.get("templateSlug") || ""),
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const jsonMode = wantsJson(request);
  if (!(await isAdmin(request))) {
    return jsonMode ? jsonError("انتهت جلسة الأدمن. سجل الدخول مرة أخرى.", 401) : NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const { id } = await context.params;
  const payload = jsonMode ? ((await request.json().catch(() => null)) as AdminOrderPayload | null) : payloadFromForm(await request.formData());
  if (!payload) return jsonMode ? jsonError("بيانات الطلب غير صالحة.") : redirectBack(request, "failed");
  const action = payload.action || "update";

  try {
    if (action === "delete") {
      if (prisma) await prisma.orderRequest.delete({ where: { id } }).catch(() => null);
      await deleteFileOrder(id).catch(() => null);
      revalidatePath("/admin/orders");
      queueGitHubSync(`Order deleted from admin: ${id}.`, { createSnapshot: true });
      return jsonMode ? NextResponse.json({ ok: true, deleted: true }) : redirectBack(request, "deleted");
    }

    if (action === "review") {
      await updateOrder(id, payload, "REVIEWING");
      const order = await getSnapshot(id, request);
      revalidatePath("/admin/orders");
      queueGitHubSync(`Order marked reviewing: ${id}.`, { createSnapshot: true });
      return jsonMode ? NextResponse.json({ ok: true, order }) : redirectBack(request, "accepted");
    }

    if (action === "reject") {
      await updateOrder(id, payload, "REJECTED");
      const order = await getSnapshot(id, request);
      revalidatePath("/admin/orders");
      queueGitHubSync(`Order rejected from admin: ${id}.`, { createSnapshot: true });
      return jsonMode ? NextResponse.json({ ok: true, order }) : redirectBack(request, "rejected");
    }

    if (action === "publish") {
      const code = (await publishPrismaOrder(id, payload)) || (await publishFileOrder(id, payload));
      if (!code) throw new Error("لم يتم العثور على الطلب.");
      revalidatePath("/admin/orders");
      revalidatePath("/admin/client-invitations");
      revalidatePath(`/${code}`);
      revalidatePath(getCustomerAdminPath(code));
      queueGitHubSync(`Order published as invitation: ${code}.`, { createSnapshot: true });
      const order = await getSnapshot(id, request);
      const links = responseLinks(request, code);
      return jsonMode ? NextResponse.json({ ok: true, code, ...links, order }) : redirectBack(request, `converted-${code}`);
    }

    await updateOrder(id, payload, "EDITED");
    const order = await getSnapshot(id, request);
    revalidatePath("/admin/orders");
    queueGitHubSync(`Order updated from admin: ${id}.`, { createSnapshot: true });
    return jsonMode ? NextResponse.json({ ok: true, order }) : redirectBack(request, "updated");
  } catch (error) {
    console.error("Failed to handle admin order action", { id, action, error });
    const message = error instanceof Error ? error.message : "تعذر تنفيذ الإجراء. راجع البيانات أو حاول مرة أخرى.";
    return jsonMode ? jsonError(message, 500) : redirectBack(request, `error:${message}`);
  }
}
