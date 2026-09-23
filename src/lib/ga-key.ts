/**
 * Reads the service-account key however it was pasted. A double-quoted value
 * in an .env file has its \n escapes turned into real newlines by the env
 * loader, which is invalid inside a JSON string; a value pasted with its
 * quotes kept arrives double-encoded; and a double-encoded value inside
 * double quotes arrives with its escaped quotes intact but its newlines
 * expanded. All three are accepted.
 */
export function parseServiceAccount(raw: string): { client_email: string; private_key: string } | null {
  const newlinesEscaped = raw.replace(/\r?\n/g, "\\n");
  const attempts = [raw, newlinesEscaped, `"${newlinesEscaped}"`];
  for (const text of attempts) {
    try {
      let value: unknown = JSON.parse(text);
      if (typeof value === "string") value = JSON.parse(value);
      const key = value as { client_email?: unknown; private_key?: unknown };
      if (typeof key.client_email === "string" && typeof key.private_key === "string") {
        return { client_email: key.client_email, private_key: key.private_key };
      }
    } catch {
      // try the next form
    }
  }
  return null;
}
