import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { normalizeImageForDisplay } from "@/lib/display-images";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { imageExtensionForUpload, imageExtensionFromBytes, isSupportedImageFile } from "@/lib/image-formats";
import { updateHomePreviewSettings } from "@/lib/preview-settings";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

async function savePreviewMedia(file: File | null) {
  if (!file || !file.size) return { url: "", mode: "" };
  const isImage = isSupportedImageFile(file);
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) return { url: "", mode: "" };
  if (isImage && file.size > 80 * 1024 * 1024) return { url: "", mode: "" };
  if (isVideo && file.size > 35 * 1024 * 1024) return { url: "", mode: "" };

  const extensionByType: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  let bytes: Buffer = Buffer.from(await file.arrayBuffer());
  let extension = isImage ? imageExtensionForUpload(file.type, file.name, imageExtensionFromBytes(bytes) || "jpg") : extensionByType[file.type] || "mp4";
  if (isImage) {
    const normalized = await normalizeImageForDisplay(bytes, extension, `home-preview:${file.name || file.type}`);
    if (!normalized) return { url: "", mode: "" };
    bytes = normalized.bytes;
    extension = normalized.extension;
  }

  const fileName = `home-preview-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "previews");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), bytes);
  return { url: `/uploads/previews/${fileName}`, mode: isImage ? "image" : "video" };
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const mode = String(formData.get("mode") || "");
  const templateSlug = String(formData.get("templateSlug") || "");
  const mediaUrl = String(formData.get("mediaUrl") || "");
  const imageUrl = String(formData.get("imageUrl") || "");
  const uploadedImageUrl = String(formData.get("previewImage") || "");
  const videoUrl = String(formData.get("videoUrl") || "");
  const previewMedia = formData.get("previewMedia");
  const previewVideo = formData.get("previewVideo");
  const uploadedMedia = await savePreviewMedia(previewMedia instanceof File ? previewMedia : previewVideo instanceof File ? previewVideo : null);

  await updateHomePreviewSettings({
    mode,
    templateSlug,
    mediaUrl,
    uploadedMediaUrl: uploadedMedia.url,
    uploadedMediaMode: uploadedMedia.mode,
    imageUrl,
    uploadedImageUrl,
    videoUrl,
  });

  revalidatePath("/");
  revalidatePath("/admin/preview");
  queueGitHubSync("Homepage preview settings updated from admin.", { createSnapshot: true });

  return NextResponse.redirect(getRedirectUrl("/admin/preview?saved=1", request.headers, request.nextUrl.origin), 303);
}
