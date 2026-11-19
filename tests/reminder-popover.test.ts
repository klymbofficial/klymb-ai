import { strict as assert } from "node:assert";
import { test } from "node:test";
import { popoverBox } from "../src/components/pwa/ReminderBell";

/** The panel must sit inside the screen, 16px in from each side, for every place the bell is. */
function onScreen(box: ReturnType<typeof popoverBox>, view: { width: number; height: number }) {
  assert.ok(box.left >= 16, `left ${box.left} is off the left edge`);
  assert.ok(box.left + box.width <= view.width - 16, `right edge ${box.left + box.width} is off the right edge`);
  if (box.top !== undefined) assert.ok(box.top >= 0, `top ${box.top} is off the top`);
  if (box.bottom !== undefined) assert.ok(box.bottom >= 0 && box.bottom <= view.height, `bottom ${box.bottom} is off the screen`);
}

test("the sidebar bell (bottom-left, 1440x900) opens upward and stays on screen", () => {
  const view = { width: 1440, height: 900 };
  const bell = { top: 856, bottom: 892, right: 52 };
  const box = popoverBox(bell, view, "above");
  onScreen(box, view);
  assert.equal(box.top, undefined, "anchored from the bottom, so it opens above the bell");
  assert.equal(box.left, 16, "clamped to the left margin, not pushed past the edge");
});

test("the phone bell (top-right, 375x667) stays on screen, below the bell", () => {
  const view = { width: 375, height: 667 };
  const bell = { top: 12, bottom: 48, right: 340 };
  const box = popoverBox(bell, view, "below");
  onScreen(box, view);
  assert.equal(box.top, 56, "just under the bell");
});

test("a 320px phone narrows the panel instead of clipping it", () => {
  const view = { width: 320, height: 568 };
  const box = popoverBox({ top: 12, bottom: 48, right: 300 }, view, "below");
  onScreen(box, view);
  assert.equal(box.width, 288, "the panel is no wider than the screen minus the margins");
});

test("a bell at the very left edge still gets a panel on screen", () => {
  const view = { width: 375, height: 667 };
  onScreen(popoverBox({ top: 300, bottom: 336, right: 4 }, view, "below"), view);
});
