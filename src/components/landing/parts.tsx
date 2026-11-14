/* Small pieces shared by the homepage sections: the inline wordmark, photos and Lucide icons drawn with the design's own paths. */

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
 * A cover-cropped photograph filling its positioned parent. ScrollMotion
 * drifts it a little slower than the page (parallax). No credit line: the
 * Unsplash licence doesn't require one.
 */
export function Photo({ src, priority = false }: { src: string; priority?: boolean }) {
  return (
    <div className="kl-photo">
      {/* eslint-disable-next-line @next/next/no-img-element -- Unsplash already serves these at the sizes the design asks for */}
      <img src={src} alt="" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async" />
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

/*
 * The companies' marks without their names, for the "Built by experts from"
 * chip on phones, in their own colours. Amazon's is the Simple Icons mark
 * (public/logos/amazon.svg) split so the smile can be orange.
 */
export function AmazonMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Amazon">
      <path
        fill="#201e1d"
        d="M6.61 11.802c0-1.005.247-1.863.743-2.577.495-.71 1.17-1.25 2.04-1.615.796-.335 1.756-.575 2.912-.72.39-.046 1.033-.103 1.92-.174v-.37c0-.93-.105-1.558-.3-1.875-.302-.43-.78-.65-1.44-.65h-.182c-.48.046-.896.196-1.246.46-.35.27-.575.63-.675 1.096-.06.3-.206.465-.435.51l-2.52-.315c-.248-.06-.372-.18-.372-.39 0-.046.007-.09.022-.15.247-1.29.855-2.25 1.82-2.88.976-.616 2.1-.975 3.39-1.05h.54c1.65 0 2.957.434 3.888 1.29.135.15.27.3.405.48.12.165.224.314.283.45.075.134.15.33.195.57.06.254.105.42.135.51.03.104.062.3.076.615.01.313.02.493.02.553v5.28c0 .376.06.72.165 1.036.105.313.21.54.315.674l.51.674c.09.136.136.256.136.36 0 .12-.06.226-.18.314-1.2 1.05-1.86 1.62-1.963 1.71-.165.135-.375.15-.63.045a6.062 6.062 0 01-.526-.496l-.31-.347a9.391 9.391 0 01-.317-.42l-.3-.435c-.81.886-1.603 1.44-2.4 1.665-.494.15-1.093.227-1.83.227-1.11 0-2.04-.343-2.76-1.034-.72-.69-1.08-1.665-1.08-2.94l-.05-.076zM10.363 11.364c0 .566.14 1.02.425 1.364.285.34.675.512 1.155.512.045 0 .106-.007.195-.02.09-.016.134-.023.166-.023.614-.16 1.08-.553 1.424-1.178.165-.28.285-.58.36-.91.09-.32.12-.59.135-.8.015-.195.015-.54.015-1.005v-.54c-.84 0-1.484.06-1.92.18-1.275.36-1.92 1.17-1.92 2.43l-.035-.02z"
      />
      <path
        fill="#ff9900"
        d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726a17.617 17.617 0 01-10.951-.577 17.88 17.88 0 01-5.43-3.35c-.1-.074-.151-.15-.151-.22 0-.047.021-.09.051-.13zM19.525 18.391c.03-.06.075-.11.132-.17.362-.243.714-.41 1.05-.5a8.094 8.094 0 011.612-.24c.14-.012.28 0 .41.03.65.06 1.05.168 1.172.33.063.09.099.228.099.39v.15c0 .51-.149 1.11-.424 1.8-.278.69-.664 1.248-1.156 1.68-.073.06-.14.09-.197.09-.03 0-.06 0-.09-.012-.09-.044-.107-.12-.064-.24.54-1.26.806-2.143.806-2.64 0-.15-.03-.27-.087-.344-.145-.166-.55-.257-1.224-.257-.243 0-.533.016-.87.046-.363.045-.7.09-1 .135-.09 0-.148-.014-.18-.044-.03-.03-.036-.047-.02-.077 0-.017.006-.03.02-.063v-.06z"
      />
    </svg>
  );
}

export function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Google">
      <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function MicrosoftMark({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 23 23" role="img" aria-label="Microsoft">
      <rect x="1" y="1" width="10" height="10" fill="#f35325" />
      <rect x="12" y="1" width="10" height="10" fill="#81bc06" />
      <rect x="1" y="12" width="10" height="10" fill="#05a6f0" />
      <rect x="12" y="12" width="10" height="10" fill="#ffba08" />
    </svg>
  );
}

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

export const IconArrowDown = (p: IconProps) => (
  <Icon strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </Icon>
);

export const IconClipboardCheck = (p: IconProps) => (
  <Icon strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect width="8" height="4" x="8" y="2" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="m9 14 2 2 4-4" />
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
