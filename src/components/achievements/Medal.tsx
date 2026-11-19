import clsx from "clsx";
import type { CSSProperties } from "react";
import { MEDAL_FAMILIES, type MedalFamily, type MedalIcon } from "@/lib/achievements";
import { Icon } from "@/components/course-app/icons";

/**
 * A badge's medal: the System Design course app's artwork, shared. A ribbed
 * ring around a domed core, its colour and shape set by the badge's family
 * (gold circle for learning, blue hexagon for assessment, red shield for
 * habit, green octagon for craft). Locked medals are drawn in stone with a lock.
 *
 * Size it with `className` (a square, e.g. "size-[76px]"); `icon` scales with `iconSize`.
 */
export function Medal({ family, icon, on, className, iconSize = 24, style }: {
  family: MedalFamily;
  icon: MedalIcon;
  on: boolean;
  className?: string;
  iconSize?: number;
  style?: CSSProperties;
}) {
  const c = MEDAL_FAMILIES[family];
  const ring = on
    ? `repeating-conic-gradient(from 0deg, rgba(255,255,255,.38) 0 3deg, transparent 3deg 15deg), conic-gradient(from 210deg, ${c.light}, ${c.base}, ${c.deep}, ${c.base}, ${c.light})`
    : "repeating-conic-gradient(from 0deg, rgba(255,255,255,.5) 0 3deg, transparent 3deg 15deg), #d9d4cc";
  const core = on
    ? `radial-gradient(circle at 35% 28%, ${c.base} 0%, ${c.deep} 78%)`
    : "radial-gradient(circle at 35% 28%, #f4f1ec, #e2ddd5 80%)";
  return (
    <span
      aria-hidden="true"
      className={clsx("block flex-none", className)}
      style={{ filter: on ? `drop-shadow(0 6px 10px ${c.deep}55) drop-shadow(0 1px 1px rgba(0,0,0,.15))` : "none", ...style }}
    >
      <span className="block size-full p-[6.5%]" style={{ borderRadius: c.radius, clipPath: c.clip, background: ring }}>
        <span className="flex size-full items-center justify-center" style={{ borderRadius: c.radius, clipPath: c.clip, background: core, color: on ? "#fff" : "#8f8a83" }}>
          <Icon name={on ? icon : "lock"} size={iconSize} stroke={2} />
        </span>
      </span>
    </span>
  );
}

/** The family's name and colours, for a caption beside a medal. */
export function medalFamily(family: MedalFamily) {
  return MEDAL_FAMILIES[family];
}
