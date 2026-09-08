// Converts raw backend / database errors into friendly, non-technical messages
// for UI banners, so users never see things like {'code':'42501', ...}.
export function humanizeError(msg) {
  const s = String(msg || "").toLowerCase();
  if (!s) return "Something went wrong. Please try again.";

  if (s.includes("row-level security") || s.includes("42501"))
    return "The server blocked this action due to database permissions. Please contact your administrator.";
  if (s.includes("42p10") || s.includes("on conflict") || s.includes("no unique"))
    return "Couldn't save because of a database configuration issue. Please contact your administrator.";
  if (s.includes("duplicate") || s.includes("already exists") || s.includes("unique"))
    return "This entry already exists.";
  if (s.includes("failed to fetch") || s.includes("networkerror") || s.includes("load failed"))
    return "Can't reach the server. Check that the backend is running and try again.";
  if (s.includes("admin access") || s.includes(" 403"))
    return "You don't have permission to do this.";
  if (s.includes("jwt") || s.includes("expired") || s.includes(" 401") || s.includes("unauthorized"))
    return "Your session has expired. Please sign in again.";

  return "A server error occurred. Please try again, or contact your administrator if it keeps happening.";
}
