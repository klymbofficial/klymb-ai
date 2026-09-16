import { signInLearner } from "@/app/(learn)/learn/actions";
import { GoogleMark } from "@/components/ui/GoogleMark";

export function LearnerLoginForm({ error }: { error?: string }) {
  return (
    <div className="mt-6 flex flex-col gap-4">
      <form action={signInLearner}>
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-3 border-2 border-ink bg-white px-4 py-3 text-sm font-bold text-ink transition-colors hover:bg-surface"
        >
          <GoogleMark />
          Continue with Google
        </button>
      </form>
      {error && <p role="alert" className="border-2 border-red-deep bg-red-tint p-3 text-sm font-semibold text-red-deep">{error}</p>}
      <p className="text-xs text-muted">Use the same email you registered with, so we can find your place.</p>
    </div>
  );
}
