"use server";

import { db } from "@/lib/db/client";
import { normaliseEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { clamp, LIMITS } from "@/lib/validation";
import { SD_PRICE } from "./price";

export type PreRegisterResult = { ok: true } | { ok: false; errors?: Record<string, string>; message?: string };

/** Reserves a System Design place at the early price. Nothing is charged. */
export async function preRegister(form: FormData): Promise<PreRegisterResult> {
  // Bots fill every field, including the hidden one.
  if (form.get("website")) return { ok: true };

  const name = clamp(form.get("name"), LIMITS.name);
  const email = normaliseEmail(String(form.get("email") ?? ""));
  const phone = clamp(form.get("phone"), LIMITS.phone).replace(/[\s()-]/g, "");
  const status = String(form.get("status") ?? "");
  const consent = form.get("consent") === "on";

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Please enter your name.";
  if (!email) errors.email = "Please enter a valid email.";
  if (!/^\+?\d{10,13}$/.test(phone)) errors.phone = "Please enter a valid phone number.";
  if (status !== "student" && status !== "working") errors.status = "Please choose one.";
  if (!consent) errors.consent = "Please agree so we can send you the payment link.";
  if (Object.keys(errors).length) return { ok: false, errors };

  const limit = await checkRateLimit("sd-preregister", { limit: 5, windowMinutes: 60 });
  if (!limit.allowed) return { ok: false, message: "Too many tries from this connection. Please try again later." };

  const sql = db();
  if (!sql) return { ok: false, message: "Pre-registration is not available right now. Please email us instead." };

  const { error } = await sql.run`
    insert into course.sd_preregistrations (email, name, phone, status, locked_price, consent)
    values (${email}, ${name}, ${phone}, ${status}, ${SD_PRICE.offer}, ${consent})
    on conflict (email) do update
      set name = excluded.name, phone = excluded.phone, status = excluded.status, updated_at = now()
  `;
  if (error) {
    console.error("sd_preregistrations insert failed:", error.code, error.message);
    return { ok: false, message: "Something went wrong saving your place. Please try again." };
  }
  return { ok: true };
}
