"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { allowCompany } from "@/lib/company/access";
import { getWorkspaceMember } from "@/lib/company/auth";
import { savePassword } from "@/lib/company/password";
import type { ChangeField } from "@/lib/company/password-rules";

export type PasswordFormState =
  | { ok: true; message: string }
  | { ok: false; field?: ChangeField; message: string }
  | null;

/**
 * Sets or changes the signed-in member's password. Who they are and how this
 * session signed in come from the session and their membership of this
 * workspace, never from the form.
 */
export async function changeMyPassword(slug: string, _prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const member = await getWorkspaceMember(slug);
  if (!allowCompany(member, slug)) return { ok: false, message: "You're signed out. Sign in again, then try once more." };
  const session = await auth();
  const result = await savePassword({
    email: member.email,
    signInMethod: session?.user?.signInMethod,
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!result.ok) return { ok: false, field: result.field, message: result.error };
  revalidatePath(`/org/${member.companySlug}/settings`);
  return { ok: true, message: "Password saved. Use it next time you sign in." };
}
