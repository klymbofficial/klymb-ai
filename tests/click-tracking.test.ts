import { strict as assert } from "node:assert";
import { test } from "node:test";
import { labelOf, linkOf } from "../src/lib/click-tracking";

const host = "https://www.klymb.ai/webinar?utm_source=ig";

test("internal links keep their path and anchor, never the query", () => {
  assert.deepEqual(linkOf("/webinar?email=a@b.com#register", host), { type: "internal", url: "/webinar#register" });
  assert.deepEqual(linkOf("#faq", host), { type: "internal", url: "/webinar#faq" });
  assert.deepEqual(linkOf("https://app.klymb.ai/learn", host), { type: "internal", url: "/learn" });
});

test("outbound links report host and path only", () => {
  assert.deepEqual(linkOf("https://www.reuters.com/tech/tcs-layoffs?utm_source=x", host), { type: "outbound", url: "www.reuters.com/tech/tcs-layoffs" });
});

test("WhatsApp, email and phone links are typed, with no address or number", () => {
  assert.deepEqual(linkOf("https://chat.whatsapp.com/FDCM4Q6KcAK9bHqs5eOM2g?s=cl", host), { type: "whatsapp", url: "chat.whatsapp.com" });
  assert.deepEqual(linkOf("https://wa.me/919876543210", host), { type: "whatsapp", url: "wa.me" });
  assert.deepEqual(linkOf("mailto:someone@example.com", host), { type: "email", url: "mailto" });
  assert.deepEqual(linkOf("tel:+919876543210", host), { type: "phone", url: "tel" });
});

test("buttons have no destination", () => {
  assert.deepEqual(linkOf(null, host), { type: "button", url: "" });
  assert.deepEqual(linkOf("javascript:void(0)", host), { type: "button", url: "" });
});

test("the label prefers data-track, then aria-label, then the text, trimmed to 60", () => {
  const el = (attrs: Record<string, string>, text: string, track?: string) => ({ dataset: { track }, getAttribute: (n: string) => attrs[n] ?? null, textContent: text });
  assert.equal(labelOf(el({}, "  Pay $1 &\n  save my seat  ")), "Pay $1 & save my seat");
  assert.equal(labelOf(el({ "aria-label": "Open menu" }, "≡")), "Open menu");
  assert.equal(labelOf(el({ "aria-label": "x" }, "y", "hero_cta")), "hero_cta");
  assert.equal(labelOf(el({}, "z".repeat(100))).length, 60);
});
