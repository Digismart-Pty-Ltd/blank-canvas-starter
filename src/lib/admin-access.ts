export type AdminAccess = "loading" | "login" | "denied" | "admin";

/** Display gate only. Cloud operations still rely on database permissions. */
export function adminAccess(loading: boolean, userId: string | null, isAdmin: boolean): AdminAccess {
  if (loading) return "loading";
  if (!userId) return "login";
  return isAdmin ? "admin" : "denied";
}