/* Small pieces shared by the homepage sections: the inline wordmark, credited photos and Lucide icons drawn with the design's own paths. */

import type { SVGProps } from "react";

/** "Klymb." in running text: heavy Archivo with the red full stop. */
export function Brand({ className }: { className?: string }) {
  return (
    <span className={className ? `kl-brandword ${className}` : "kl-brandword"}>
      Klymb<span className="kl-dot">.</span>
    </span>
  );
}

/**
 * A cover-cropped photograph filling its positioned parent, with the
 * Unsplash credit in its bottom-left corner as in the design. The credit is
 * plain text: some photos sit inside clickable panels, where a link would be
 * a control inside a control.
 */
export function Photo({ src, credit = "Vitaly Gariev", priority = false }: { src: string; credit?: string; priority?: boolean }) {
  return (
    <div className="kl-photo">
      {/* eslint-disable-next-line @next/next/no-img-element -- Unsplash already serves these at the sizes the design asks for */}
      <img src={src} alt="" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async" />
      <span className="kl-credit">Photo by {credit} on Unsplash</span>
    </div>
  );
}

/** Where one person's face sits in a photo (0–1 across and down) and how far to zoom in on it. */
export interface Face { x: number; y: number; z: number }

/**
 * An Unsplash photo by id, `w` pixels wide. With a `face`, a `w`-pixel square
 * zoomed in on that one face, for avatars cut from photos of several people.
 */
export const unsplash = (id: string, w: number, face?: Face) =>
  face
    ? `https://images.unsplash.com/photo-${id}?fm=jpg&q=70&w=${w}&h=${w}&fit=crop&crop=focalpoint&fp-x=${face.x}&fp-y=${face.y}&fp-z=${face.z}&auto=format`
    : `https://images.unsplash.com/photo-${id}?fm=jpg&q=70&w=${w}&auto=format&fit=crop`;

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

const STAR =
  "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z";
const HALF =
  "M12 18.338a2.1 2.1 0 0 0-.987.244L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.12 2.12 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.12 2.12 0 0 0 1.597-1.16l2.309-4.679A.53.53 0 0 1 12 2z";

export const IconStar = (p: IconProps) => (
  <Icon {...p} stroke="none" fill="currentColor">
    <path d={STAR} />
  </Icon>
);

/** An outlined star with its left half filled: the ".5" of 4.5. */
export const IconStarHalf = (p: IconProps) => (
  <Icon strokeWidth={2} {...p}>
    <path d={STAR} />
    <path fill="currentColor" stroke="none" d={HALF} />
  </Icon>
);

/** Four and a half stars, as the design draws a 4.5 rating. */
export function Stars({ size }: { size: number }) {
  return (
    <span className="kl-stars" role="img" aria-label="4.5 out of 5 stars">
      <IconStar size={size} />
      <IconStar size={size} />
      <IconStar size={size} />
      <IconStar size={size} />
      <IconStarHalf size={size} />
    </span>
  );
}

export const IconCheck = (p: IconProps) => (
  <Icon strokeWidth={2} {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);

export const IconArrowRight = (p: IconProps) => (
  <Icon strokeWidth={2} {...p}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Icon>
);

export const IconArrowUpRight = (p: IconProps) => (
  <Icon strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M7 17 17 7" />
    <path d="M7 7h10v10" />
  </Icon>
);

export const IconShieldCheck = (p: IconProps) => (
  <Icon strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);

export const IconPartyPopper = (p: IconProps) => (
  <Icon strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5.8 11.3 2 22l10.7-3.79" />
    <path d="M4 3h.01" />
    <path d="M22 8h.01" />
    <path d="M15 2h.01" />
    <path d="M22 20h.01" />
    <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
    <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17" />
    <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7" />
    <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" />
  </Icon>
);

export const IconMessageCircle = (p: IconProps) => (
  <Icon strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </Icon>
);

export const IconBadgeCheck = (p: IconProps) => (
  <Icon strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);

export const IconCircleCheck = (p: IconProps) => (
  <Icon strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="m9 12 2 2 4-4" />
    <circle cx="12" cy="12" r="10" />
  </Icon>
);
