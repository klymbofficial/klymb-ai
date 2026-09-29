import { signInLearner } from "@/app/(learn)/learn/actions";
import { ButtonLink } from "@/components/ui/Button";
import { GoogleMark } from "@/components/ui/GoogleMark";
import type { Track } from "@/types/program";

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

function Seal() {
  return (
    <svg viewBox="0 0 100 100" className="size-28" role="img" aria-label="Registered">
      <path d={SEAL} fill="var(--color-red)" />
      <path
        d="M30 52 L44 66 L71 34"
        fill="none"
        stroke="#fff"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface SuccessState {
  enrolled: boolean;
  duplicate: boolean;
  email: string;
  track?: Track;
  /** Registered while signed in with Google: the course can open directly. */
  signedIn?: boolean;
}

/** The message shown once a registration has been saved. */
export function RegistrationSuccess({ enrolled, duplicate, email, track, signedIn }: SuccessState) {
  return (
    <div className="flex flex-col items-center px-8 py-10 text-center sm:px-12 sm:py-12">
      <Seal />

      <p id="register-success-title" className="display mt-7 text-[2.6rem] text-white">{enrolled || track?.available ? "You're in." : "Interest registered."}</p>

      <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-white/80">
        {duplicate && <p>You had already registered with this email: nothing was duplicated.</p>}

        {enrolled ? (
          <>
            <p>
              Your place on the <strong className="font-bold text-white">{track?.name}</strong> track is reserved.
            </p>
            <p>
              {signedIn
                ? "Day 1 is open. Start whenever you are ready."
                : <>Continue with the Google account for <strong className="font-bold text-white">{email}</strong> to open Day 1 and start today.</>}
            </p>
          </>
        ) : track?.available && !track.contentLive ? (
          <>
            <p>
              Your place on the <strong className="font-bold text-white">{track.name}</strong> track is reserved.
            </p>
            <p>Day 1 opens soon. We will email {email} the moment it does, and your 30 days start from that day.</p>
          </>
        ) : track?.available ? (
          <p>
            You chose the <strong className="font-bold text-white">{track.name}</strong> track. We will confirm your
            place at {email} shortly, and you will be able to start Day 1 from there.
          </p>
        ) : (
          <p>
            You chose the <strong className="font-bold text-white">{track?.name}</strong> track, which opens in a later
            cohort. We will email {email} the moment it does.
          </p>
        )}

        <p>No payment has been taken.</p>
      </div>

      {/* Straight into the course: already signed in, or one Google step that
          lands on Day 1, never a separate sign-in page. */}
      {enrolled && signedIn && (
        <ButtonLink href="/learn" arrow className="mt-8 rounded-full px-7">
          Start Day 1
        </ButtonLink>
      )}
      {enrolled && !signedIn && (
        <form action={signInLearner} className="mt-8">
          <button
            type="submit"
            className="inline-flex items-center gap-3 rounded-full bg-white px-7 py-3 text-sm font-bold text-ink transition-colors hover:bg-paper"
          >
            <GoogleMark />
            Continue with Google to start Day 1
          </button>
        </form>
      )}
    </div>
  );
}
