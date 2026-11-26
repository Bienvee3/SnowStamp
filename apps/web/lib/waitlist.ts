/**
 * The waitlist form address comes from the environment, never from the repository.
 * Returns the URL only when it is a valid https address; otherwise null (the page then shows no link).
 */
export function waitlistUrl(raw: string | undefined): string | null {
  if (raw === undefined || raw.trim() === "") {
    return null;
  }
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
