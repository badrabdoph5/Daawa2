const reservedRoutes = new Set([
  "admin",
  "api",
  "client",
  "contact",
  "faq",
  "order",
  "pricing",
  "templates",
  "_next",
]);

export function slugifyInvitationName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildInvitationBaseSlug(groomEnglish: string, brideEnglish: string) {
  const groom = slugifyInvitationName(groomEnglish);
  const bride = slugifyInvitationName(brideEnglish);
  const base = [groom, bride].filter(Boolean).join("-");
  return base && !reservedRoutes.has(base) ? base : "wedding-invitation";
}

export function makeNumberedInvitationSlug(baseSlug: string, existingCodes: string[]) {
  const used = new Set(existingCodes.map((code) => code.toLowerCase()));
  let index = 1;
  let code = `${baseSlug}-${index}`;

  while (used.has(code.toLowerCase()) || reservedRoutes.has(code.toLowerCase())) {
    index += 1;
    code = `${baseSlug}-${index}`;
  }

  return code;
}

export function getCustomerAdminPath(code: string) {
  return `/${code}/ad_3399`;
}
