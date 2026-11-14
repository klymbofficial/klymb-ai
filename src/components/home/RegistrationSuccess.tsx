import { HIDE_MONEY } from "@/lib/site-status";
import { ButtonLink } from "@/components/ui/Button";
import { PayButton } from "./PayButton";
import { priceNow } from "@/lib/offer";
import { contact } from "@/data/config";
import { successModel, type RegistrationOutcome } from "@/lib/registration-outcome";

/**
 * A scalloped seal, drawn rather than shipped as an asset.
 *
 * Vertices sit on the inner radius and the control points on the outer one, so
 * each segment bulges outwards into a rounded bump.
 */
function sealPath(bumps = 20, inner = 44, outer = 50) {
  const total = bumps * 2;
  const point = (i: number): [number, number] => {
    const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? inner : outer;
    return [50 + r * Math.cos(angle), 50 + r * Math.sin(angle)];
  };

  const [x0, y0] = point(0);
  let d = `M${x0.toFixed(2)} ${y0.toFixed(2)}`;
  for (let i = 1; i < total; i += 2) {
    const [cx, cy] = point(i);
    const [x, y] = point((i + 1) % total);
    d += `Q${cx.toFixed(2)} ${cy.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
}

const SEAL = sealPath();

/** A tick where it is done; an "i" where the registration is saved but something is still to do. */
function Seal({ tone }: { tone: "done" | "saved" }) {
  return (
    <svg viewBox="0 0 100 100" className="size-24 sm:size-28" role="img" aria-label={tone === "done" ? "Registered" : "Saved"}>
      <path d={SEAL} fill="var(--color-red)" />
      {tone === "done" ? (
        <path d="M30 52 L44 66 L71 34" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <path d="M50 46 L50 70" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" />
          <circle cx="50" cy="31" r="6.5" fill="#fff" />
        </>
      )}
    </svg>
  );
}

export interface SuccessState extends RegistrationOutcome {
  /** The canonical repository, owner/name, as saved. */
  repo?: string;
}

/**
 * What the person sees once Register has been pressed and it worked: what was
 * saved, what happens next in order, and the one button that moves them on.
 * The words come from successModel, so each real outcome has its own answer.
 */
export function RegistrationSuccess({ onRetry, repo, ...outcome }: SuccessState & { onRetry?: () => void }) {
  const { track, email } = outcome;
  const m = successModel(outcome);

  return (
    <div className="flex flex-col items-center px-6 py-9 text-center sm:px-12 sm:py-12">
      <Seal tone={m.tone} />

      <h2 id="register-success-title" className="display mt-6 text-[2.3rem] text-white sm:text-[2.6rem]">{m.title}</h2>

      <div className="mt-4 max-w-md space-y-3 text-[15px] leading-relaxed text-white/80">
        {m.repeatNote && <p>{m.repeatNote}</p>}
        <p>{m.lead}</p>
      </div>

      {/* What was saved, so a typo is caught here and not on Day 1. */}
      <dl aria-label="What was saved" className="mt-6 w-full max-w-md divide-y divide-white/10 rounded-xl bg-white/5 text-left text-sm ring-1 ring-white/10">
        {track && (
          <div className="flex justify-between gap-4 px-4 py-2.5">
            <dt className="text-white/55">Track</dt>
            <dd className="text-right font-semibold text-white">{track.name}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 px-4 py-2.5">
          <dt className="text-white/55">Email</dt>
          <dd className="min-w-0 break-words text-right font-semibold text-white">{email}</dd>
        </div>
        {repo && (
          <div className="flex justify-between gap-4 px-4 py-2.5">
            <dt className="text-white/55">Repository</dt>
            <dd className="min-w-0 break-all text-right font-semibold text-white">{repo}</dd>
          </div>
        )}
      </dl>

      <div className="mt-6 w-full max-w-md text-left">
        <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/55">What happens next</h3>
        <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-white/85">
          {m.steps.map((s, i) => (
            <li key={s} className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/15 text-[11px] font-bold text-white nums">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>

      {!HIDE_MONEY && <p className="mt-6 text-[15px] text-white/80">{track?.price === 0 ? "This track is free: there is nothing to pay." : "No payment has been taken yet."}</p>}

      {track?.available && track.price > 0 && (
        <>
          <p className="mt-6 text-sm text-white/75">Day 1 is free. Pay when you&apos;re ready to unlock Days 2 to 30.</p>
          <PayButton email={email} track={track.slug} price={priceNow(track.price)} />
        </>
      )}

      {/* Straight into the course: they are signed in already. */}
      <div className="mt-8 flex flex-col items-center gap-4">
        {m.action === "start-day-1" && (
          <ButtonLink href={track ? `/learn/tracks/${track.slug}/day/1` : "/learn"} soft arrow className="rounded-full px-7">Start Day 1</ButtonLink>
        )}
        {m.action === "retry" && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center rounded-full bg-white px-7 py-3 text-sm font-bold text-ink transition-colors hover:bg-paper"
          >
            Back to the form
          </button>
        )}
        <p className="text-xs text-white/55">
          Something not right?{" "}
          <a href={`mailto:${contact.email}`} className="font-bold text-white underline underline-offset-4 hover:text-red-soft">{contact.email}</a>
        </p>
      </div>
    </div>
  );
}
