import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isListed, libraryCourses, listedCourses, LIVE_COURSES } from "../src/data/course-cards";

test("every live course is a real library course, so a typo can't hide one", () => {
  for (const slug of LIVE_COURSES) assert.ok(libraryCourses.some((c) => c.slug === slug), `${slug} is in the library`);
});

test("outside development the library lists only the live courses", () => {
  assert.notEqual(process.env.NODE_ENV, "development");
  assert.deepEqual(listedCourses.map((c) => c.slug), libraryCourses.filter((c) => LIVE_COURSES.includes(c.slug)).map((c) => c.slug));
  assert.ok(listedCourses.some((c) => c.slug === "system-design"), "System Design is live");
  assert.ok(listedCourses.some((c) => c.slug === "agentic-ai"), "Agentic AI Systems is live");
  assert.equal(isListed("claude"), false);
  assert.equal(isListed("dsa-arrays"), false);
});

test("in development every course is listed, so unfinished ones can be checked locally", () => {
  const was = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "development" });
  try {
    for (const c of libraryCourses) assert.equal(isListed(c.slug), true, c.slug);
    assert.equal(isListed("dsa-arrays"), true);
  } finally {
    Object.assign(process.env, { NODE_ENV: was });
    if (was === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV;
  }
});
