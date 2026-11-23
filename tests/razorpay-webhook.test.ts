import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { webhookAction, webhookSignatureValid } from "../src/lib/razorpay-webhook";

const sign = (body: string, secret: string) => createHmac("sha256", secret).update(body).digest("hex");

test("accepts only the correct webhook signature", () => {
  const body = JSON.stringify({ event: "payment.captured" });
  assert.equal(webhookSignatureValid(body, sign(body, "s3cret"), "s3cret"), true);
  assert.equal(webhookSignatureValid(body, sign(body, "other"), "s3cret"), false);
  assert.equal(webhookSignatureValid(body + " ", sign(body, "s3cret"), "s3cret"), false);
  assert.equal(webhookSignatureValid(body, null, "s3cret"), false);
});

test("maps events to payment updates", () => {
  const payment = { payload: { payment: { entity: { id: "pay_1", order_id: "order_1" } } } };
  assert.deepEqual(webhookAction({ event: "payment.captured", ...payment }), { kind: "paid", orderId: "order_1", paymentId: "pay_1" });
  assert.deepEqual(webhookAction({ event: "order.paid", ...payment }), { kind: "paid", orderId: "order_1", paymentId: "pay_1" });
  assert.deepEqual(webhookAction({ event: "payment.failed", ...payment }), { kind: "failed", orderId: "order_1", paymentId: "pay_1" });
  assert.deepEqual(webhookAction({ event: "refund.processed", payload: { refund: { entity: { payment_id: "pay_1" } } } }), { kind: "refunded", paymentId: "pay_1" });
  assert.deepEqual(webhookAction({ event: "payment.authorized", ...payment }), { kind: "ignore" });
  assert.deepEqual(webhookAction({ event: "payment.captured" }), { kind: "ignore" });
});

test("a payment in another currency brings Razorpay's INR figure with it", () => {
  const entity = { id: "pay_2", order_id: "order_2", currency: "USD", amount: 2000, base_amount: 178500, base_currency: "INR" };
  assert.deepEqual(webhookAction({ event: "payment.captured", payload: { payment: { entity } } }), { kind: "paid", orderId: "order_2", paymentId: "pay_2", inr: 178500 });
  const inr = { id: "pay_3", order_id: "order_3", currency: "INR" };
  assert.deepEqual(webhookAction({ event: "payment.captured", payload: { payment: { entity: inr } } }), { kind: "paid", orderId: "order_3", paymentId: "pay_3" });
});
