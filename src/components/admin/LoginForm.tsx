import { signInWithGoogle } from "@/app/admin/actions";
import { GoogleMark } from "@/components/ui/GoogleMark";

/** Google is the only admin door: access is granted by adding the email to admin_users. */
export function LoginForm({ error }: { error?: string }) {
  return (
    <div className="mt-6 flex flex-col gap-4">
      <form action={async () => { "use server"; await signInWithGoogle(); }}>
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-line/50 bg-white px-4 py-3 shadow-card text-sm font-bold text-ink transition-colors hover:bg-surface"
        >
          <GoogleMark />
          Continue with Google
        </button>
      </form>
      {error && <p role="alert" className="border-2 border-error bg-error-tint p-3 text-sm font-semibold text-error">{error}</p>}
      <p className="text-xs text-muted">
        Only approved Klymb.ai addresses can open the admin. Ask an existing admin to add yours.
      </p>
    </div>
  );
}
