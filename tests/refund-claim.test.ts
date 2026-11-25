import { strict as assert } from "node:assert";
import { test } from "node:test";
import { trailLines, type TrailEvent } from "../src/lib/admin/sd-event-words";
import { SD_EVENTS } from "../src/lib/sd-events";

const ev = (choice: string): TrailEvent => ({ created_at: "2026-11-23T10:00:00+05:30", event: "refund", lesson: null, step: null, props: { choice } });

test("the refund choice is an event the course may send, and reads plainly in the trail", () => {
  assert.ok((SD_EVENTS as readonly string[]).includes("refund"));
  assert.equal(trailLines([ev("claim")])[0].text, "Claimed the completion refund");
  assert.match(trailLines([ev("keep")])[0].text, /keep supporting Klymb/);
  assert.equal(trailLines([ev("open")])[0].text, "Opened the refund claim");
});

