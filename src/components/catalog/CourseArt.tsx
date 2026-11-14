"use client";

import { useId, useSyncExternalStore, type ReactNode } from "react";

/**
 * Illustrations for the featured courses' cards: each one draws what the
 * course is about, on the card's tinted ruled ground, with a little motion
 * that stops for anyone who asks the system for reduced motion.
 * Every drawing is 380 × 200, the card art's 19:10 box.
 */

const REDUCE = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (fn: () => void) => {
  const m = window.matchMedia(REDUCE);
  m.addEventListener("change", fn);
  return () => m.removeEventListener("change", fn);
};
const useMotion = () => !useSyncExternalStore(subscribeMotion, () => window.matchMedia(REDUCE).matches, () => false);

/** A four-point sparkle centred on 0,0. */
const sparkle = (s: number) => {
  const k = s * 0.2;
  return `M0 ${-s}C${k} ${-k} ${k} ${-k} ${s} 0C${k} ${k} ${k} ${k} 0 ${s}C${-k} ${k} ${-k} ${k} ${-s} 0C${-k} ${-k} ${-k} ${-k} 0 ${-s}Z`;
};

function Frame({ children }: { children: (shadow: string) => ReactNode }) {
  const id = `art${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 380 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-[1.03]">
      <defs>
        <filter id={id} x="-25%" y="-25%" width="150%" height="170%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#201e1d" floodOpacity="0.13" />
        </filter>
      </defs>
      {children(`url(#${id})`)}
    </svg>
  );
}

/** Claude Challenge: a 60-day streak filling in, and a prompt being written. */
function ClaudeArt() {
  const motion = useMotion();
  const INK = "#9c4320";
  const MID = "#d9764a";
  const DONE = 37;
  const LEVELS = [0.32, 0.52, 0.76, 1];
  return (
    <Frame>
      {(shadow) => (
        <>
          <text x="26" y="93" fontSize="10.5" fontWeight="800" letterSpacing="0.9" fill={INK}>DAY {DONE + 1} OF 60</text>
          {Array.from({ length: 60 }, (_, i) => {
            const x = 26 + Math.floor(i / 5) * 14.5;
            const y = 102 + (i % 5) * 14.5;
            if (i < DONE) return <rect key={i} x={x} y={y} width="11" height="11" rx="3" fill={INK} opacity={LEVELS[((i * 37 + 11) % 13) % 4]} />;
            if (i === DONE)
              return (
                <rect key={i} x={x - 1} y={y - 1} width="13" height="13" rx="3.5" fill={MID} stroke="#fff" strokeWidth="1.5">
                  {motion && <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />}
                </rect>
              );
            return <rect key={i} x={x} y={y} width="11" height="11" rx="3" fill="#fff" fillOpacity="0.75" stroke={INK} strokeOpacity="0.16" />;
          })}

          <g transform="translate(184 50)">
            <path d={sparkle(17)} fill={MID}>
              {motion && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="16s" repeatCount="indefinite" />}
            </path>
          </g>
          <g transform="translate(206 34)">
            <path d={sparkle(6)} fill={INK}>
              {motion && <animate attributeName="opacity" values="1;0.2;1" dur="2.4s" repeatCount="indefinite" />}
            </path>
          </g>

          <g filter={shadow}>
            <rect x="214" y="60" width="144" height="106" rx="14" fill="#fff" />
          </g>
          <g transform="translate(232 80)"><path d={sparkle(6.5)} fill={INK} /></g>
          <text x="244" y="84" fontSize="10" fontWeight="800" fill="#201e1d">Today&apos;s task</text>
          <rect x="228" y="96" width="114" height="6" rx="3" fill="#f3dfd3" />
          <rect x="228" y="108" width="84" height="6" rx="3" fill="#f3dfd3" />
          <rect x="226" y="124" width="120" height="28" rx="14" fill="#fbeae1" stroke="#f0c9b4" />
          <rect x="239" y="135" width="50" height="6" rx="3" fill={MID} opacity="0.65" />
          <rect x="293" y="131.5" width="1.8" height="13" rx="0.9" fill={INK}>
            {motion && <animate attributeName="opacity" values="1;0;1" dur="1s" calcMode="discrete" repeatCount="indefinite" />}
          </rect>
          <circle cx="332" cy="138" r="9.5" fill={INK} />
          <path d="M332 142.5v-9m-3.6 3.6 3.6-3.6 3.6 3.6" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />

          <g filter={shadow}>
            <rect x="268" y="158" width="78" height="22" rx="11" fill={INK} />
          </g>
          <path d="M279 169.5l3 3 5.5-6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <text x="292" y="173" fontSize="10" fontWeight="800" fill="#fff">Shipped</text>
        </>
      )}
    </Frame>
  );
}

/** 31 Days AI Cohort: a healthcare chatbot, wired to what it is built from. */
function CohortArt() {
  const motion = useMotion();
  const INK = "#4a3aa6";
  const MID = "#7b6be0";
  const nodes = [
    { y: 72, label: "RAG", icon: <><path d="M-4.5-6H2l3 3v9h-9.5z" fill="none" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" /><path d="M-2-.5h4.5M-2 2.5h4.5" stroke={INK} strokeWidth="1.2" strokeLinecap="round" /></> },
    { y: 104, label: "Agents", icon: <><rect x="-5.5" y="-3.5" width="11" height="9" rx="2.5" fill="none" stroke={INK} strokeWidth="1.4" /><circle cx="-2.2" cy="1" r="1.2" fill={INK} /><circle cx="2.2" cy="1" r="1.2" fill={INK} /><path d="M0-3.5v-2.5" stroke={INK} strokeWidth="1.4" strokeLinecap="round" /></> },
    { y: 136, label: "MCP", icon: <><path d="M-2.8-6.5v3.5M2.8-6.5v3.5M0 4.5v2.5" stroke={INK} strokeWidth="1.4" strokeLinecap="round" /><path d="M-5-3h10v2.5c0 3-2.2 5-5 5s-5-2-5-5z" fill="none" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" /></> },
    { y: 168, label: "Deploy", icon: <path d="M0 4V-5.5M-4-1.5l4-4 4 4M-5 6.5h10" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> },
  ];
  const wire = (y: number) => `M200 120C244 120 240 ${y} 283 ${y}`;
  return (
    <Frame>
      {(shadow) => (
        <>
          {nodes.map((n, i) => (
            <g key={n.label}>
              <path d={wire(n.y)} fill="none" stroke="#b9b0f1" strokeWidth="1.5" strokeDasharray="3 4">
                {motion && <animate attributeName="stroke-dashoffset" from="14" to="0" dur="0.9s" repeatCount="indefinite" />}
              </path>
              {motion && (
                <circle r="2.6" fill={INK}>
                  <animateMotion path={wire(n.y)} dur="2.4s" begin={`${i * 0.6}s`} repeatCount="indefinite" />
                </circle>
              )}
            </g>
          ))}

          <g filter={shadow}>
            <rect x="24" y="54" width="176" height="124" rx="14" fill="#fff" />
          </g>
          <circle cx="41" cy="72" r="8" fill={INK} />
          <g transform="translate(41 72)"><path d={sparkle(4.5)} fill="#fff" /></g>
          <text x="55" y="75.5" fontSize="10" fontWeight="800" fill="#201e1d">Health assistant</text>
          <circle cx="186" cy="72" r="3" fill="#2fa36b" />
          <path d="M24 86h176" stroke="#ecebfb" />

          <rect x="104" y="94" width="84" height="20" rx="10" fill={INK} />
          <rect x="114" y="101.5" width="60" height="5" rx="2.5" fill="#fff" opacity="0.85" />
          <rect x="36" y="120" width="118" height="28" rx="10" fill="#ecebfb" />
          <rect x="46" y="127" width="96" height="5" rx="2.5" fill="#b9b0f1" />
          <rect x="46" y="137" width="68" height="5" rx="2.5" fill="#b9b0f1" />
          <rect x="36" y="154" width="42" height="16" rx="8" fill="#ecebfb" />
          {[47, 57, 67].map((cx, i) => (
            <circle key={cx} cx={cx} cy="162" r="2.6" fill={MID}>
              {motion && <animate attributeName="opacity" values="0.25;1;0.25" dur="1.2s" begin={`${i * 0.2}s`} repeatCount="indefinite" />}
            </circle>
          ))}

          {nodes.map((n) => (
            <g key={n.label}>
              <g filter={shadow}><circle cx="296" cy={n.y} r="13" fill="#fff" stroke="#d5cff7" strokeWidth="1.5" /></g>
              <g transform={`translate(296 ${n.y})`}>{n.icon}</g>
              <text x="316" y={n.y + 3.5} fontSize="10" fontWeight="800" fill={INK}>{n.label}</text>
            </g>
          ))}
        </>
      )}
    </Frame>
  );
}

/** System Design: requests flowing from a client through a load balancer to servers, a cache and a database. */
function SystemDesignArt() {
  const motion = useMotion();
  const INK = "#1d6a50";
  const MID = "#3f9a78";
  const LINE = "#8fc8b0";
  const servers = [78, 120, 162];
  const route = (y: number) => `M74 120H136C156 120 156 ${y} 176 ${y}H232C262 ${y} 262 134 290 134`;
  return (
    <Frame>
      {(shadow) => (
        <>
          <path d="M74 120h30" stroke={LINE} strokeWidth="1.6" />
          {servers.map((y) => (
            <g key={y} fill="none" stroke={LINE} strokeWidth="1.6">
              <path d={`M136 120C156 120 156 ${y} 176 ${y}`} />
              <path d={`M232 ${y}C262 ${y} 262 134 290 134`} />
            </g>
          ))}
          <path d="M232 74C254 74 262 75 286 75" fill="none" stroke={LINE} strokeWidth="1.6" strokeDasharray="3 4">
            {motion && <animate attributeName="stroke-dashoffset" from="14" to="0" dur="0.9s" repeatCount="indefinite" />}
          </path>

          {motion &&
            servers.map((y, i) => (
              <circle key={y} r="3.2" fill={INK}>
                <animateMotion path={route(y)} dur="2.7s" begin={`${i * 0.9}s`} repeatCount="indefinite" />
              </circle>
            ))}

          <g filter={shadow}>
            <rect x="28" y="102" width="42" height="29" rx="4" fill="#fff" stroke={INK} strokeWidth="1.5" />
          </g>
          <rect x="34" y="108" width="20" height="4" rx="2" fill={LINE} />
          <rect x="34" y="116" width="30" height="4" rx="2" fill="#d4ebe0" />
          <path d="M22 134h54l-4 6H26z" fill={INK} />
          <text x="49" y="157" fontSize="10" fontWeight="800" fill={INK} textAnchor="middle">Client</text>

          <g filter={shadow}>
            <rect x="104" y="104" width="32" height="32" rx="9" fill={INK} />
          </g>
          <path d="M111 120h6m0 0 9-7m-9 7h9m-9 0 9 7" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <text x="120" y="153" fontSize="10" fontWeight="800" fill={INK} textAnchor="middle">LB</text>

          {servers.map((y, i) => (
            <g key={y}>
              <g filter={shadow}><rect x="176" y={y - 12} width="56" height="24" rx="6" fill="#fff" stroke={MID} strokeWidth="1.3" /></g>
              <circle cx="186" cy={y} r="2.2" fill="#2fa36b">
                {motion && <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" begin={`${i * 0.45}s`} repeatCount="indefinite" />}
              </circle>
              <circle cx="193" cy={y} r="2.2" fill={LINE} />
              <rect x="200" y={y - 3} width="24" height="2.6" rx="1.3" fill="#cfe7dc" />
              <rect x="200" y={y + 1.5} width="16" height="2.6" rx="1.3" fill="#cfe7dc" />
            </g>
          ))}

          <g filter={shadow}>
            <rect x="286" y="62" width="62" height="26" rx="7" fill="#d4ebe0" stroke={MID} strokeWidth="1.3" />
          </g>
          <text x="317" y="79" fontSize="10" fontWeight="800" fill={INK} textAnchor="middle">Cache</text>

          <g filter={shadow}>
            <path d="M290 112v42c0 4 12 7.5 27 7.5s27-3.5 27-7.5v-42" fill="#fff" stroke={INK} strokeWidth="1.5" />
          </g>
          <path d="M290 126c0 4 12 7.5 27 7.5s27-3.5 27-7.5M290 140c0 4 12 7.5 27 7.5s27-3.5 27-7.5" fill="none" stroke={LINE} strokeWidth="1.3" />
          <ellipse cx="317" cy="112" rx="27" ry="7.5" fill="#e1f1e9" stroke={INK} strokeWidth="1.5" />
          <text x="317" y="180" fontSize="10" fontWeight="800" fill={INK} textAnchor="middle">Database</text>
        </>
      )}
    </Frame>
  );
}

/** Agentic AI Systems: the agent loop (plan, act, observe, reflect) turning, with tool calls leaving it. */
function AgenticArt() {
  const motion = useMotion();
  const INK = "#1f4f8f";
  const MID = "#4a86d6";
  const LINE = "#9bbbe6";
  const PALE = "#cfe0f7";
  const CX = 130;
  const CY = 112;
  const R = 50;
  const ring = `M${CX + R} ${CY}A${R} ${R} 0 1 1 ${CX - R} ${CY}A${R} ${R} 0 1 1 ${CX + R} ${CY}`;
  const steps = [
    { label: "Plan", x: CX, y: CY - R, w: 44 },
    { label: "Act", x: CX + R, y: CY, w: 38 },
    { label: "Observe", x: CX, y: CY + R, w: 58 },
    { label: "Reflect", x: CX - R, y: CY, w: 52 },
  ];
  const tools = [
    { label: "Search", y: 66, icon: <><circle cx="-1" cy="-1" r="3.6" fill="none" stroke={INK} strokeWidth="1.4" /><path d="m1.8 1.8 3.2 3.2" stroke={INK} strokeWidth="1.4" strokeLinecap="round" /></> },
    { label: "Code", y: 112, icon: <path d="M-2.5-4-6 0l3.5 4M2.5-4 6 0 2.5 4" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /> },
    { label: "API", y: 158, icon: <><circle cx="-3.5" cy="0" r="2" fill="none" stroke={INK} strokeWidth="1.4" /><circle cx="3.5" cy="-3" r="2" fill="none" stroke={INK} strokeWidth="1.4" /><circle cx="3.5" cy="3" r="2" fill="none" stroke={INK} strokeWidth="1.4" /><path d="m-1.6-.6 3.2-1.8m-3.2 3 3.2 1.8" stroke={INK} strokeWidth="1.2" /></> },
  ];
  const wire = (y: number) => `M${CX + R + 19} ${CY}C240 ${CY} 240 ${y} 276 ${y}`;
  return (
    <Frame>
      {(shadow) => (
        <>
          <path d={ring} fill="none" stroke={LINE} strokeWidth="1.5" strokeDasharray="3 5">
            {motion && <animate attributeName="stroke-dashoffset" from="16" to="0" dur="1.4s" repeatCount="indefinite" />}
          </path>
          {tools.map((t, i) => (
            <g key={t.label}>
              <path d={wire(t.y)} fill="none" stroke={LINE} strokeWidth="1.5" strokeDasharray="3 4" />
              {motion && (
                <circle r="2.8" fill={INK}>
                  <animateMotion path={wire(t.y)} dur="2.4s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
                </circle>
              )}
            </g>
          ))}

          <g filter={shadow}>
            <circle cx={CX} cy={CY} r="17" fill={INK} />
          </g>
          <g transform={`translate(${CX} ${CY})`}>
            <path d={sparkle(9)} fill="#fff">
              {motion && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="14s" repeatCount="indefinite" />}
            </path>
          </g>

          {motion && (
            <circle r="4" fill={MID} stroke="#fff" strokeWidth="1.5">
              <animateMotion path={ring} dur="7s" repeatCount="indefinite" />
            </circle>
          )}

          {steps.map((s) => (
            <g key={s.label}>
              <g filter={shadow}>
                <rect x={s.x - s.w / 2} y={s.y - 10} width={s.w} height="20" rx="10" fill="#fff" stroke={MID} strokeWidth="1.3" />
              </g>
              <text x={s.x} y={s.y + 3.5} fontSize="10" fontWeight="800" fill={INK} textAnchor="middle">{s.label}</text>
            </g>
          ))}

          {tools.map((t) => (
            <g key={t.label}>
              <g filter={shadow}>
                <rect x="276" y={t.y - 12} width="76" height="24" rx="8" fill="#fff" stroke={PALE} strokeWidth="1.5" />
              </g>
              <g transform={`translate(291 ${t.y})`}>{t.icon}</g>
              <text x="303" y={t.y + 3.5} fontSize="10" fontWeight="800" fill={INK}>{t.label}</text>
            </g>
          ))}
        </>
      )}
    </Frame>
  );
}

const ART: Record<string, () => ReactNode> = {
  claude: ClaudeArt,
  "ai-cohort": CohortArt,
  "system-design": SystemDesignArt,
  "agentic-ai": AgenticArt,
};

export const hasCourseArt = (slug: string) => slug in ART;

export function CourseArt({ slug }: { slug: string }) {
  const Art = ART[slug];
  return Art ? <Art /> : null;
}
