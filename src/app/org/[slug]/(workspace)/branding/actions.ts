"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { logCompany } from "@/lib/company/audit";
import { adminFor } from "@/lib/company/auth";
import { putBrandFile } from "@/lib/company/brand-storage";
import { checkDraft, logoKey, MAX_LOGO_BYTES, sameBrand, sniffLogo, type BrandField, type BrandSettings } from "@/lib/company/branding";
import { loadBranding, publishDraft, saveDraft } from "@/lib/company/branding-data";
import { db } from "@/lib/db/client";
import { checkRateLimit } from "@/lib/rate-limit";

export type BrandingResult =
  | { ok: true; message: string; draft?: BrandSettings }
  | { ok: false; message: string; errors?: Partial<Record<BrandField, string>> };

const NOT_ALLOWED: BrandingResult = { ok: false, message: "Only your company's admin can do this. Try signing in again." };
const UNAVAILABLE: BrandingResult = { ok: false, message: "That didn't work just now. Please try again in a minute." };

function refresh(slug: string) {
  // The brand shows on every workspace page and on the sign-in page.
  revalidatePath(`/org/${slug}`, "layout");
  revalidatePath(`/org/${slug}/sign-in`);
}

/** Saves the draft. Nothing changes for anyone else until it is published. */
export async function saveBrandDraft(slug: string, input: Record<string, unknown>): Promise<BrandingResult> {
  const admin = await adminFor(slug);
  if (!admin) return NOT_ALLOWED;
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const state = await loadBranding(sql, admin.companyId);
  if (!state) return UNAVAILABLE;

  const checked = checkDraft(input, state.draft);
  if (!checked.ok) return { ok: false, message: "Nothing was saved. Fix the fields marked below.", errors: checked.errors };
  if (!(await saveDraft(sql, admin.companyId, checked.value, admin.email))) return UNAVAILABLE;
  await logCompany(admin, "company.brand_draft", {});
  revalidatePath(`/org/${slug}/settings/company`);
  return { ok: true, message: "Draft saved. Check the preview, then publish it when it looks right.", draft: checked.value };
}

/**
 * Uploads a logo into the draft. PNG, JPEG or WebP, by its first bytes, up to
 * 512 KB; never SVG. Stored under its own hash, so the same file is the same
 * name. Limited per admin, so the button can't fill the storage.
 */
export async function uploadBrandLogo(slug: string, formData: FormData): Promise<BrandingResult> {
  const admin = await adminFor(slug);
  if (!admin) return NOT_ALLOWED;
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an image to upload." };
  if (file.size > MAX_LOGO_BYTES) return { ok: false, message: `That image is ${Math.ceil(file.size / 1024)} KB. Keep it under ${MAX_LOGO_BYTES / 1024} KB.` };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = sniffLogo(bytes);
  if (!ext) return { ok: false, message: "Use a PNG, JPEG or WebP image. SVG and other files aren't accepted." };

  const limit = await checkRateLimit("company_brand_logo", { limit: 20, windowMinutes: 60, identity: admin.email });
  if (!limit.allowed) return { ok: false, message: "You've uploaded a lot of images in the last hour. Please try again later." };

  const sql = db();
  if (!sql) return UNAVAILABLE;
  const state = await loadBranding(sql, admin.companyId);
  if (!state) return UNAVAILABLE;

  const key = logoKey(admin.companyId, `${createHash("sha256").update(bytes).digest("hex").slice(0, 16)}.${ext}`);
  if (!key) return UNAVAILABLE;
  if (!(await putBrandFile(key, bytes))) return { ok: false, message: "Logo uploads aren't available right now. Please try again later." };

  const draft: BrandSettings = { ...state.draft, logo: { key, alt: state.draft.logo?.alt ?? null } };
  if (!(await saveDraft(sql, admin.companyId, draft, admin.email))) return UNAVAILABLE;
  await logCompany(admin, "company.brand_logo", { bytes: bytes.byteLength, type: ext });
  revalidatePath(`/org/${slug}/settings/company`);
  return { ok: true, message: "Logo added to the draft. Your people won't see it until you publish.", draft };
}

/** Publishes the saved draft, exactly as saved. From the next page anyone opens, everyone sees it. */
export async function publishBrand(slug: string): Promise<BrandingResult> {
  const admin = await adminFor(slug);
  if (!admin) return NOT_ALLOWED;
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const state = await loadBranding(sql, admin.companyId);
  if (!state) return UNAVAILABLE;
  if (!state.draftUpdatedAt) return { ok: false, message: "Save a draft first." };
  if (state.published && sameBrand(state.draft, state.published)) return { ok: false, message: "The draft is already published." };

  const published = await publishDraft(sql, admin.companyId, admin.email);
  if (published === null) return UNAVAILABLE;
  if (!published) return { ok: false, message: "Save a draft first." };
  await logCompany(admin, "company.brand_publish", {});
  refresh(slug);
  return { ok: true, message: "Published. Your workspace, sign-in page and new invite emails now use it." };
}
