import { strict as assert } from "node:assert";
import { test } from "node:test";
import { ensureLearner, UNIQUE_VIOLATION, type EnrolmentClient } from "../src/lib/learner/enrolment";

/** Records what the code tried to do, so idempotency can be asserted. */
function stubClient({ existing, insertError }: { existing?: unknown; insertError?: { code?: string } | null }) {
  const inserts: Record<string, unknown>[] = [];
  const client: EnrolmentClient = {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: existing ?? null, error: null }) }),
      }),
      insert: async (values: Record<string, unknown>) => {
        inserts.push(values);
        return { error: insertError ?? null };
      },
    }),
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
  const { client } = stubClient({ insertError: { code: UNIQUE_VIOLATION } });
  assert.equal(await ensureLearner(client, input), true);
});

test("a real failure reports not enrolled", async () => {
  const { client } = stubClient({ insertError: { code: "42501" } });
  assert.equal(await ensureLearner(client, input), false);
});
