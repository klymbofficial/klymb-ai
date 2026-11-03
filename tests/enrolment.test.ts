import { strict as assert } from "node:assert";
import { test } from "node:test";
import { ensureLearner, UNIQUE_VIOLATION, type EnrolmentClient, type ProfileLinks } from "../src/lib/learner/enrolment";

/** Records what the code tried to do, so idempotency can be asserted. */
function stubClient({ existing, insertError, platformUserId, links }: {
  existing?: { id: string } | null;
  insertError?: { code?: string } | null;
  platformUserId?: string | null;
  links?: ProfileLinks | null;
}) {
  const inserts: Record<string, unknown>[] = [];
  const client: EnrolmentClient = {
    findLearner: async () => existing ?? null,
    findProfileLinks: async () => links ?? null,
    findPlatformUserId: async () => platformUserId ?? null,
    insertLearner: async (values: Record<string, unknown>) => {
      inserts.push(values);
      return { error: insertError ?? null };
    },
  };
  return { client, inserts };
}

const input = { email: "learner@klymb.ai", name: "Learner", track: "project-manager", cohortStart: "2026-09-25" };

test("creates a place when none exists", async () => {
  const { client, inserts } = stubClient({});
  assert.equal(await ensureLearner(client, input), true);
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].email, "learner@klymb.ai");
});

test("registering twice does not create a second learner", async () => {
  const { client, inserts } = stubClient({ existing: { id: "abc" } });
  assert.equal(await ensureLearner(client, input), true);
  assert.equal(inserts.length, 0, "must not insert when a place already exists");
});

test("a racing duplicate insert still counts as enrolled", async () => {
  // The other request's row is there by the time we look again.
  let looked = 0;
  const { client } = stubClient({ insertError: { code: UNIQUE_VIOLATION } });
  client.findLearner = async () => (looked++ ? { id: "theirs" } : null);
  assert.equal(await ensureLearner(client, input), true);
});

test("a second track refused by the old one-row-per-email rule is not enrolled", async () => {
  const { client } = stubClient({ insertError: { code: UNIQUE_VIOLATION } });
  assert.equal(await ensureLearner(client, input), false);
});

test("a second track carries the LinkedIn and GitHub from the first", async () => {
  const links = { github_username: "learner", github_url: "https://github.com/learner", linkedin_slug: "learner-li", linkedin_url: "https://www.linkedin.com/in/learner-li" };
  const { client, inserts } = stubClient({ links });
  assert.equal(await ensureLearner(client, input), true);
  assert.equal(inserts[0].linkedin_slug, "learner-li");
  assert.equal(inserts[0].github_username, "learner");
});

test("the new track's own repository owner wins over the carried GitHub", async () => {
  const links = { github_username: "old", github_url: "https://github.com/old", linkedin_slug: null, linkedin_url: null };
  const { client, inserts } = stubClient({ links });
  assert.equal(await ensureLearner(client, { ...input, githubUsername: "new", githubUrl: "https://github.com/new" }), true);
  assert.equal(inserts[0].github_username, "new");
  assert.equal(inserts[0].linkedin_slug, undefined);
});

test("a real failure reports not enrolled", async () => {
  const { client } = stubClient({ insertError: { code: "42501" } });
  assert.equal(await ensureLearner(client, input), false);
});

test("a new place is linked to the app.klymb.ai user with that address", async () => {
  const { client, inserts } = stubClient({ platformUserId: "clx123platformuser" });
  assert.equal(await ensureLearner(client, input), true);
  assert.equal(inserts[0].user_id, "clx123platformuser");
});

test("someone with no platform account still enrols, unlinked", async () => {
  const { client, inserts } = stubClient({ platformUserId: null });
  assert.equal(await ensureLearner(client, input), true);
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].user_id, null);
});
