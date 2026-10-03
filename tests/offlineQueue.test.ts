import { strict as assert } from "node:assert";
import { before, beforeEach, test } from "node:test";
import type * as Q from "../src/lib/offlineQueue";

// Minimal browser globals for the queue.
const store = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
  window: { dispatchEvent: () => true },
  CustomEvent: class { constructor(public type: string) {} },
});
const nav = { onLine: true };
Object.defineProperty(globalThis, "navigator", { value: nav, configurable: true });

let readQueue: typeof Q.readQueue, submitOrQueue: typeof Q.submitOrQueue, dequeue: typeof Q.dequeue;
before(async () => ({ readQueue, submitOrQueue, dequeue } = await import("../src/lib/offlineQueue")));
const fd = (note: string) => { const f = new FormData(); f.set("note", note); return f; };

beforeEach(() => { store.clear(); nav.onLine = true; });

test("offline: queues instead of sending", async () => {
  nav.onLine = false;
  let sent = 0;
  const r = await submitOrQueue(3, fd("done"), async () => { sent++; return { ok: true }; });
  assert.deepEqual([r.ok, r.queued, sent], [true, true, 0]);
  assert.equal(readQueue()[0].day, 3);
  assert.deepEqual(readQueue()[0].entries, [["note", "done"]]);
});

test("online but unreachable: queues", async () => {
  const r = await submitOrQueue(4, fd("x"), async () => { throw new TypeError("fetch failed"); });
  assert.equal(r.queued, true);
  assert.equal(readQueue().length, 1);
});

test("online: sends, and a server refusal is returned, not queued", async () => {
  const r = await submitOrQueue(5, fd("x"), async () => ({ ok: false, message: "bad link" }));
  assert.deepEqual(r, { ok: false, message: "bad link" });
  assert.equal(readQueue().length, 0);
});

test("dequeue removes only the sent item", async () => {
  nav.onLine = false;
  await submitOrQueue(1, fd("a"), async () => ({ ok: true }));
  await submitOrQueue(2, fd("b"), async () => ({ ok: true }));
  dequeue(readQueue()[0]);
  assert.deepEqual(readQueue().map((q) => q.day), [2]);
});
