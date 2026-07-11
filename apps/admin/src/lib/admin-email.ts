// The one and only email allowed into this panel. Nothing else -- not a
// password, not a role table -- gates access.
export function isAdminEmail(email: string | null | undefined) {
  const allowed = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(allowed) && email?.trim().toLowerCase() === allowed;
}
