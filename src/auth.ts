import NextAuth from "next-auth";
import authConfig from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

/** The signed-in user's verified email, or null. Identity for the whole app. */
export async function currentEmail(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email;
  return email ? email.toLowerCase() : null;
}
