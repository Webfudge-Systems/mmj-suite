export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1337";

/** Uploaded files come back with a path on the backend; local storage needs the host added. */
export function mediaUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${API_URL}${url}`;
}
