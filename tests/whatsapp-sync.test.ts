import { strict as assert } from "node:assert";
import { test } from "node:test";
import { d1Time, planWhatsAppPage, type WaMessage } from "../src/lib/whatsapp-sync";

const msg = (o: Partial<WaMessage>): WaMessage => ({
  id: 1, phone: "919876500001", direction: "outbound", status: "sent", template_name: "sd_call", body: "Hi",
  created_at: "2026-11-13 08:09:23", u: "2026-11-13 08:09:23", contact_name: "Asha", contact_source: "",
  contact_batch: "ViCodathon Batch 1", assigned_to: "", campaign_batch: null, ...o,
});

test("D1 timestamps are UTC without a zone", () => {
  assert.equal(d1Time("2026-11-13 08:09:23"), "2026-11-13T08:09:23.000Z");
});

test("a send becomes an outreach touch and a lead; a reply becomes an inbound touch", () => {
  const plan = planWhatsAppPage([
    msg({ id: 1 }),
    msg({ id: 2, direction: "inbound", status: "received", template_name: null, body: "Interested!" }),
  ], new Set());
  assert.equal(plan.leads.length, 1);
  assert.deepEqual(plan.leads[0], { phone: "919876500001", name: "Asha", source: "hackathon", source_detail: "ViCodathon Batch 1", owner_email: null });
  assert.deepEqual(plan.touches.map((t) => [t.external_id, t.inbound, t.note]), [["wa:1", false, "Template: sd_call"], ["wa:2", true, "Interested!"]]);
  assert.deepEqual(plan.repliedPhones, ["919876500001"]);
});

test("failed sends are not outreach, and an unknown assignee is not an owner", () => {
  const plan = planWhatsAppPage([
    msg({ id: 3, status: "failed" }),
    msg({ id: 4, phone: "9876500009", contact_name: null, assigned_to: "agent@else.com" }),
    msg({ id: 5, phone: "919876500010", assigned_to: "Sarthak@Klymb.test" }),
  ], new Set(["sarthak@klymb.test"]));
  assert.deepEqual(plan.failed, ["wa:3"]);
  assert.equal(plan.leads.find((l) => l.phone === "919876500009")?.name, "WhatsApp +919876500009");
  assert.equal(plan.leads.find((l) => l.phone === "919876500009")?.owner_email, null);
  assert.equal(plan.leads.find((l) => l.phone === "919876500010")?.owner_email, "sarthak@klymb.test");
});
