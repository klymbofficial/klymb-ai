/**
 * Klymb, drawn: three people helping each other up to a job. One climbs the
 * ladder to the briefcase on the column, one steps up from a stack of books,
 * one steadies the ladder from the ground. Flat, warm, hand-built SVG, so it
 * stays sharp at any size and costs no image download.
 *
 * Figures are drawn with thick round-capped strokes for limbs and bodies, the
 * way flat editorial illustration is built.
 */

const C = {
  cream: "#f7efe3",
  column: "#ede1cc",
  columnShade: "#dccdb2",
  ladder: "#e2a23b",
  ink: "#231d1a",
  hair: "#1e1816",
  sage: "#6f8a4f",
  sageDark: "#56703c",
  coral: "#e0784f",
  coralSoft: "#ea9a78",
  olive: "#6b7a3f",
  paper: "#fbf6ee",
  mustard: "#e7b85c",
  tan: "#cfae84",
  skinA: "#a0663f",
  skinB: "#7a4a2e",
  skinC: "#c48a5c",
};

// Ladder: two rails from the ground to the column's capital.
const L0 = { x: 245, y: 640 };
const LEAN = 0.2067; // horizontal shift per pixel of height
const railX = (y: number, offset = 0) => L0.x + (640 - y) * LEAN + offset;
const RUNGS = [610, 570, 530, 490, 450, 410, 370, 330, 290, 250, 210];

const BOOKS = [
  { w: 104, h: 22, x: 128, fill: C.sage, band: C.sageDark },
  { w: 96, h: 20, x: 134, fill: C.mustard, band: C.coral },
  { w: 108, h: 23, x: 126, fill: C.coral, band: "#c9603a" },
  { w: 92, h: 20, x: 138, fill: C.tan, band: C.sage },
  { w: 102, h: 22, x: 130, fill: C.sage, band: C.sageDark },
  { w: 94, h: 21, x: 136, fill: C.coralSoft, band: C.coral },
  { w: 100, h: 20, x: 131, fill: C.mustard, band: C.sageDark },
  { w: 90, h: 22, x: 139, fill: C.sage, band: C.sageDark },
];

// Each book sits on the one below it, from the ground (y 645) up.
const STACK = BOOKS.map((b, i) => ({ ...b, y: 645 - BOOKS.slice(0, i + 1).reduce((sum, bk) => sum + bk.h, 0) }));

function Books() {
  return (
    <g>
      {STACK.map((b, i) => {
        const y = b.y;
        return (
          <g key={i}>
            <rect x={b.x} y={y} width={b.w} height={b.h} rx={4} fill={b.fill} />
            {/* Page edges on the right, a band on the spine. */}
            <rect x={b.x + b.w - 14} y={y + 3} width={10} height={b.h - 6} rx={2} fill={C.paper} opacity={0.9} />
            <rect x={b.x + 12} y={y} width={7} height={b.h} fill={b.band} opacity={0.85} />
          </g>
        );
      })}
    </g>
  );
}

function Column() {
  return (
    <g>
      <rect x={388} y={204} width={70} height={428} fill={C.column} />
      {[402, 416, 430, 444].map((x) => (
        <line key={x} x1={x} y1={210} x2={x} y2={626} stroke={C.columnShade} strokeWidth={3} strokeLinecap="round" />
      ))}
      {/* Capital with two scrolls, and the base. */}
      <rect x={376} y={188} width={94} height={16} rx={4} fill={C.column} />
      <circle cx={380} cy={202} r={9} fill={C.column} stroke={C.columnShade} strokeWidth={3} />
      <circle cx={466} cy={202} r={9} fill={C.column} stroke={C.columnShade} strokeWidth={3} />
      <rect x={378} y={628} width={90} height={17} rx={3} fill={C.column} />
    </g>
  );
}

function Briefcase() {
  return (
    <g>
      <path d="M414 158v-8a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8" fill="none" stroke={C.ink} strokeWidth={5} />
      <rect x={398} y={156} width={52} height={33} rx={6} fill={C.ink} />
      <rect x={398} y={168} width={52} height={4} fill="#3b322d" />
      <rect x={420} y={165} width={8} height={10} rx={2} fill={C.ladder} />
      {/* A glint: the goal is within reach. */}
      <path className="sparkle" d="M476 136l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill={C.ladder} />
      <path className="sparkle sparkle-late" d="M372 150l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill={C.coral} />
    </g>
  );
}

function Ladder() {
  return (
    <g stroke={C.ladder} strokeLinecap="round">
      <line x1={L0.x} y1={640} x2={railX(190)} y2={190} strokeWidth={8} />
      <line x1={L0.x + 40} y1={640} x2={railX(190, 40)} y2={190} strokeWidth={8} />
      {RUNGS.map((y) => (
        <line key={y} x1={railX(y)} y1={y} x2={railX(y, 40)} y2={y} strokeWidth={6} />
      ))}
    </g>
  );
}

/** Top of the ladder, reaching for the briefcase. */
function Climber() {
  return (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      {/* legs: one on a lower rung, one bent onto the next */}
      <path d="M340 262 L331 297 L330 327" stroke={C.sage} strokeWidth={15} />
      <path d="M346 262 Q366 272 342 289" stroke={C.sage} strokeWidth={15} />
      <path d="M322 330h14M334 292h14" stroke={C.ink} strokeWidth={8} />
      {/* holding the rail */}
      <path d="M346 222 L332 238 L326 250" stroke={C.skinA} strokeWidth={10} />
      {/* body */}
      <path d="M343 256 L350 222" stroke={C.coral} strokeWidth={30} />
      {/* reaching for the handle */}
      <path d="M356 218 L386 190 L416 152" stroke={C.coral} strokeWidth={11} />
      <circle cx={417} cy={150} r={6} fill={C.skinA} />
      {/* head and hair */}
      <circle cx={354} cy={197} r={14} fill={C.skinA} />
      <path d="M340 196 a14 14 0 0 1 28 -3 q-10 -4 -18 3 q-4 10 -10 12z" fill={C.hair} />
    </g>
  );
}

/** Standing on the books, reaching for the ladder. */
function Stepper() {
  return (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M192 418 L186 466M200 418 L208 466" stroke={C.coral} strokeWidth={15} />
      <path d="M178 468h14M202 468h14" stroke={C.ink} strokeWidth={8} />
      <path d="M188 380 L182 412" stroke={C.sage} strokeWidth={11} />
      <path d="M196 412 L197 372" stroke={C.sage} strokeWidth={32} />
      <path d="M206 378 L250 386 L292 393" stroke={C.sage} strokeWidth={11} />
      <circle cx={293} cy={393} r={6} fill={C.skinB} />
      <circle cx={199} cy={352} r={14} fill={C.skinB} />
      <path d="M186 348 a14 14 0 0 1 27 -2 q-6 -2 -12 2 q-2 14 -12 22 q-6 -10 -3 -22z" fill={C.hair} />
    </g>
  );
}

/** At the foot of the ladder, holding it steady. */
function Steadier() {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M332 584 L362 584 L370 634 L324 634 Z" fill={C.olive} />
      <path d="M332 640h12M350 640h12" stroke={C.ink} strokeWidth={8} fill="none" />
      <path d="M347 584 L346 548" stroke={C.sageDark} strokeWidth={30} fill="none" />
      <path d="M338 552 L318 558 L304 556M340 566 L322 584 L306 584" stroke={C.sageDark} strokeWidth={10} fill="none" />
      <circle cx={303} cy={556} r={5.5} fill={C.skinC} />
      <circle cx={305} cy={584} r={5.5} fill={C.skinC} />
      <circle cx={344} cy={530} r={14} fill={C.skinC} />
      <path d="M333 522 a14 14 0 0 1 25 6 q-8 -6 -16 -4 q-6 2 -9 -2z" fill={C.hair} />
      <circle cx={357} cy={524} r={7} fill={C.hair} />
    </g>
  );
}

export function ClimbIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="90 110 420 560"
      role="img"
      aria-label="Illustration: three people helping each other climb a ladder to a briefcase on top of a column"
      className={className}
    >
      <ellipse cx={300} cy={648} rx={200} ry={10} fill={C.columnShade} opacity={0.6} />
      <Column />
      <Books />
      <Ladder />
      <Steadier />
      <Stepper />
      <Climber />
      <Briefcase />
    </svg>
  );
}
