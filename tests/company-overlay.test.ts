import { strict as assert } from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";

/** P0.2a: one overlay for the workspace, in-app confirmations, and the sidebar's drawer and collapse. */

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const overlay = read("src/components/company/Overlay.tsx");
const sidebar = read("src/components/company/OrgSidebar.tsx");
const library = read("src/components/library/LibraryPicker.tsx");

describe("P0.2a overlays", () => {
  test("an overlay is a labelled modal dialog with a visible close X", () => {
    assert.match(overlay, /aria-modal="true"/);
    assert.match(overlay, /aria-labelledby=\{titleId\}/);
    assert.match(overlay, /<CloseX onClick=\{requestClose\} \/>/);
  });

  test("Escape closes, Tab stays inside, the page doesn't scroll, focus goes back", () => {
    assert.match(overlay, /e\.key === "Escape"/);
    assert.match(overlay, /e\.key !== "Tab"/);
    assert.match(overlay, /document\.body\.style\.overflow = "hidden"/);
    assert.match(overlay, /opener\.focus\(\)/);
    assert.match(overlay, /all\[all\.length - 1\] !== panel\.current/, "only the topmost overlay answers keys");
  });

  test("it animates both ways, stays mounted through the exit, and respects reduced motion", () => {
    assert.match(overlay, /export const OVERLAY_MS = 220/);
    assert.match(overlay, /setTimeout\(\(\) => setMounted\(false\), ms\)/);
    assert.match(overlay, /motion-reduce:transition-none/);
    assert.match(overlay, /starting:translate-x-full/, "the entry runs from @starting-style, not animation frames");
  });

  test("a confirmation starts on the safe choice", () => {
    assert.match(overlay, /onClick=\{\(\) => answer\(false\)\} data-autofocus=""/);
  });

  test("a dirty overlay asks before closing, on the overlay itself", () => {
    assert.match(overlay, /if \(dirty && !asking\) setAsking\(true\)/);
    assert.match(overlay, /Discard your changes\?/);
  });

  test("no company, library or test-editor page uses the browser's confirm dialog", () => {
    const dirs = ["src/components/company", "src/components/library"];
    const files = dirs.flatMap((d) => readdirSync(new URL(`../${d}`, import.meta.url)).filter((f) => f.endsWith(".tsx")).map((f) => `${d}/${f}`));
    files.push("src/components/admin/AssessmentEditor.tsx");
    for (const f of files) {
      if (f.endsWith("Overlay.tsx")) continue;
      assert.doesNotMatch(read(f), /window\.confirm\(/, f);
    }
  });
});

describe("P0.2a sidebar", () => {
  test("the phone drawer animates, closes with an X or Escape, and keeps focus inside", () => {
    assert.match(sidebar, /usePresence\(open\)/);
    assert.match(sidebar, /useOverlayFocus\(mounted && open, drawer/);
    assert.match(sidebar, /<CloseX dark label="Close menu"/);
    assert.match(sidebar, /shown \? "translate-x-0 starting:-translate-x-full" : "-translate-x-full"/);
  });

  test("wide screens collapse to icons and back, remembered in this browser only, labels kept for screen readers", () => {
    assert.match(sidebar, /aria-label=\{collapsed \? "Expand sidebar" : "Collapse sidebar"\}/);
    assert.match(sidebar, /collapsed \? "w-16" : "w-60"/);
    assert.match(sidebar, /try \{ window\.localStorage\.setItem/);
    assert.match(sidebar, /<span className=\{narrow \? "sr-only" : undefined\}>\{item\.label\}<\/span>/);
  });

  test("the collapsed rail uses a fixed compact logo and carries no platform co-brand", () => {
    assert.match(sidebar, /compact=\{narrow\}/);
    assert.doesNotMatch(sidebar, /on Klymb\.ai/);
  });
});

describe("library picker", () => {
  test("switching libraries keeps a stable bottom-anchored panel", () => {
    assert.match(library, /items-end justify-center/);
    assert.match(library, /h-\[min\(52rem,100dvh\)\]/);
    assert.match(library, /transition-\[height\]/);
  });

  test("a question title opens an accessible preview without selecting it", () => {
    assert.match(library, /onClick=\{\(\) => setPreview\(x\)\}/);
    assert.match(library, /aria-label=\{`Select \$\{x\.title\}`\}/);
    assert.match(library, /<Overlay open=\{preview !== null\}/);
    assert.match(library, /<QuestionPreview question=\{preview\}/);
    assert.match(library, /if \(preview\) setPreview\(null\)/);
    assert.match(library, /else onClose\(\)/);
  });
});
