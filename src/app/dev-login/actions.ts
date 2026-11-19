"use server";

import { notFound } from "next/navigation";
import { signIn } from "@/auth";
import { devLandingPath, devLoginEnabled, devUserByEmail } from "@/lib/dev-login";

/** Signs in as one of the fixed dev people. A 404 wherever the dev sign-in is off. */
export async function devSignIn(formData: FormData) {
  if (!devLoginEnabled()) notFound();
  const user = devUserByEmail(formData.get("email"));
  if (!user) notFound();
  await signIn("dev-login", { email: user.email, redirectTo: devLandingPath(user) });
}
