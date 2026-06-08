import { z } from "zod";

const validDateString = (value: string) => !Number.isNaN(Date.parse(value));

export const orderRequestSchema = z.object({
  groomName: z.string().trim().min(2),
  brideName: z.string().trim().min(2),
  phone: z.string().trim().optional().default(""),
  weddingDate: z.string().trim().min(8).refine(validDateString, "اكتب تاريخ صحيح"),
  venue: z.string().trim().optional().default(""),
  mapUrl: z.string().trim().max(500).optional().default(""),
  notes: z.string().trim().max(1000).optional(),
  orderImages: z.array(z.string()).max(3).optional().default([]),
  photographerEnabled: z.boolean().optional().default(false),
  photographerName: z.string().trim().max(120).optional().default(""),
  photographerFacebookUrl: z.string().trim().max(500).optional().default(""),
  photographerInstagramUrl: z.string().trim().max(500).optional().default(""),
  musicEnabled: z.boolean().optional().default(false),
  musicChoice: z.enum(["default", "upload", "url"]).optional().default("default"),
  musicUrl: z.string().trim().max(500).optional().default(""),
  orderMusic: z.string().optional().default(""),
  idempotencyKey: z.string().trim().max(120).optional().default(""),
  templateSlug: z.string().trim().min(2),
  language: z.enum(["ar", "en"]),
});

export const rsvpSchema = z.object({
  name: z.string().trim().min(2, "اكتب الاسم بالكامل"),
  phone: z.string().trim().min(8, "اكتب رقم هاتف صحيح"),
  attendees: z.coerce.number().int().min(1).max(20),
  status: z.enum(["confirmed", "declined"]),
  note: z.string().trim().max(500).optional(),
});
