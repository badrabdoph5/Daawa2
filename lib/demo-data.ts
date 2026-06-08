import type { GuestRsvp, Invitation, OrderRequest } from "./types";

export const demoInvitations: Invitation[] = [
  {
    id: "inv_001",
    code: "badr-sarah-1",
    templateSlug: "featured-1",
    language: "ar",
    groomName: "بدر",
    brideName: "Sara",
    weddingDate: "2026-10-26",
    weddingTime: "07:00 مساءً",
    venue: "قاعة رويال",
    city: "البحيرة",
    mapUrl: "https://maps.google.com/?q=Royal+Hall+Beheira",
    heroPhoto: "/assets/invite/badr-sarah-1.jpeg",
    gallery: ["/assets/invite/badr-sarah-1.jpeg", "/assets/invite/badr-sarah-2.jpeg", "/assets/invite/badr-sarah-3.jpeg"],
    musicUrl: "",
    isActive: true,
    views: 1842,
    customerId: "cus_001",
  },
  {
    id: "inv_002",
    code: "NILE26",
    templateSlug: "royal-envelope",
    language: "ar",
    groomName: "بدر",
    brideName: "Sara",
    weddingDate: "2026-10-26",
    weddingTime: "07:00 مساءً",
    venue: "Four Seasons Nile Plaza",
    city: "القاهرة",
    mapUrl: "https://maps.google.com/?q=Four+Seasons+Nile+Plaza",
    heroPhoto: "/assets/brand/couple-royal.png",
    gallery: ["/assets/templates/royal-envelope.png"],
    musicUrl: "",
    isActive: true,
    views: 2367,
    customerId: "cus_002",
  },
];

export const demoGuests: GuestRsvp[] = [
  {
    id: "gst_001",
    invitationCode: "badr-sarah-1",
    name: "محمد عبدالعزيز",
    phone: "01012345678",
    attendees: 2,
    status: "confirmed",
    note: "ألف مبروك",
    createdAt: "2026-06-01T20:15:00.000Z",
  },
  {
    id: "gst_002",
    invitationCode: "badr-sarah-1",
    name: "هنا مصطفى",
    phone: "01198765432",
    attendees: 3,
    status: "confirmed",
    createdAt: "2026-06-02T12:45:00.000Z",
  },
  {
    id: "gst_003",
    invitationCode: "badr-sarah-1",
    name: "كريم سالم",
    phone: "01210002000",
    attendees: 1,
    status: "declined",
    note: "مسافر يومها",
    createdAt: "2026-06-03T09:10:00.000Z",
  },
  {
    id: "gst_004",
    invitationCode: "NILE26",
    name: "ياسمين علي",
    phone: "01055554444",
    attendees: 2,
    status: "confirmed",
    createdAt: "2026-06-04T18:25:00.000Z",
  },
];

export const demoOrders: OrderRequest[] = [
  {
    id: "ord_001",
    groomName: "يوسف",
    brideName: "نور",
    phone: "01011511561",
    weddingDate: "2026-11-21",
    venue: "Royal Maxim Palace Kempinski",
    notes: "عايزين قالب ملكي وفيه صور كتير.",
    templateSlug: "royal-envelope",
    language: "ar",
    status: "new",
    createdAt: "2026-06-05T14:30:00.000Z",
  },
  {
    id: "ord_002",
    groomName: "عمر",
    brideName: "تاليا",
    phone: "01122223333",
    weddingDate: "2026-12-05",
    venue: "El Gouna",
    notes: "فرح على البحر وأسلوب مودرن.",
    templateSlug: "royal-envelope",
    language: "en",
    status: "accepted",
    createdAt: "2026-06-05T17:20:00.000Z",
  },
];

export function getInvitationByCode(code: string) {
  return demoInvitations.find((invitation) => invitation.code.toLowerCase() === code.toLowerCase());
}

export function getGuestsByInvitation(code: string) {
  return demoGuests.filter((guest) => guest.invitationCode.toLowerCase() === code.toLowerCase());
}
