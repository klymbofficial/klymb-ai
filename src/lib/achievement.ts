export interface Achievement {
  name: string;
  description: string;
}

const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
const short = (value: string, length: number) => {
  const chars = Array.from(value.trim().replace(/\s+/g, " "));
  return chars.length > length ? chars.slice(0, length - 1).join("") + "…" : chars.join("");
};

/** Self-contained artwork, with no remote fonts, images, or personal identifiers. */
export function achievementSvg(badge: Achievement, name: string, course: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <rect width="1200" height="900" fill="#201e1d"/>
  <path d="M0 0H1200V20H0Z" fill="#ec3013"/>
  <rect x="40" y="40" width="1120" height="820" rx="2" fill="none" stroke="#756b5e"/>
  <g font-family="Arial, sans-serif">
    <text x="88" y="125" fill="#fff" font-size="36" font-weight="700">Klymb.ai<tspan fill="#edc987"> / Achievements</tspan></text>
    <text x="88" y="245" fill="#edc987" font-size="21" letter-spacing="3">A MILESTONE WORTH SHARING</text>
    <text x="88" y="340" fill="#fff" font-size="54" font-weight="700">${escape(short(badge.name, 24))}</text>
    <text x="88" y="425" fill="#edc987" font-size="20">ACHIEVED BY</text>
    <text x="88" y="480" fill="#fff" font-size="38" font-weight="700">${escape(short(name || "A proud learner", 28))}</text>
    <text x="88" y="550" fill="#e0d9d1" font-size="25">${escape(short(course, 40))}</text>
    <text x="88" y="605" fill="#e0d9d1" font-size="21">${escape(short(badge.description, 53))}</text>
    <text x="88" y="773" fill="#fff" font-size="22" font-weight="700">Small steps. Real progress.</text>
    <text x="88" y="815" fill="#bcb5ad" font-size="17">Learning milestone · Based on recorded course activity</text>
    <text x="1105" y="815" text-anchor="end" fill="#edc987" font-size="22">klymb.ai</text>
  </g>
  <g transform="translate(948 412)">
    <path d="M-75 75L-109 224L-40 199L0 244L27 83M16 79L66 230L99 188L155 196L87 58" fill="#a71f13" stroke="#edc987" stroke-width="3"/>
    <circle r="144" fill="#292521" stroke="#edc987" stroke-width="3"/>
    <circle r="125" fill="none" stroke="#9e8150" stroke-width="2" stroke-dasharray="3 8"/>
    <path d="M0-93L71-53V38Q47 80 0 103Q-47 80-71 38V-53Z" fill="#edc987"/>
    <path d="M-34 0L-8 28L39-31" fill="none" stroke="#201e1d" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

export function achievementCaption(badge: Achievement, course: string, url: string) {
  return `Proud of this step forward: I earned the “${badge.name}” learning badge in ${course} with Klymb.ai.\n\n${badge.description}\n\nOne milestone at a time. On to the next!\n\n${url}\n\n#LearningInPublic #KlymbAI`;
}

export async function achievementPng(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 900;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image export is unavailable in this browser.");
    ctx.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create the image.")), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}
