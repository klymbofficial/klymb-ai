/**
 * Day submissions made without a connection: kept on this device and sent
 * when it reconnects. Plain localStorage, so it survives a closed tab.
 */
const KEY = "klymb:pending-submissions";
export const QUEUE_EVENT = "klymb:queue";

export interface QueuedSubmission {
  day: number;
  entries: [string, string][];
  at: number;
}

export function readQueue(): QueuedSubmission[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as QueuedSubmission[];
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedSubmission[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    /* storage full or blocked: nothing more we can do offline */
  }
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT));
}

export function enqueue(day: number, fd: FormData) {
  const entries = [...fd.entries()].filter((e): e is [string, string] => typeof e[1] === "string");
  writeQueue([...readQueue(), { day, entries, at: Date.now() }]);
}

export function dequeue(item: QueuedSubmission) {
  writeQueue(readQueue().filter((q) => !(q.day === item.day && q.at === item.at)));
}

type Result = { ok: true } | { ok: false; message: string };

/** Sends now if possible; offline (or if the request cannot reach us) it queues instead. */
export async function submitOrQueue(day: number, fd: FormData, send: (day: number, fd: FormData) => Promise<Result>): Promise<Result & { queued?: boolean }> {
  if (!navigator.onLine) {
    enqueue(day, fd);
    return { ok: true, queued: true };
  }
  try {
    return await send(day, fd);
  } catch {
    enqueue(day, fd);
    return { ok: true, queued: true };
  }
}
