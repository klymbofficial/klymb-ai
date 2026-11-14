import { Fragment, type ReactNode } from "react";

/**
 * The light Markdown the challenge tasks and hackathon briefs are written in:
 * paragraphs, "#" headings, "-" and "1." lists (nested by indent), ``` code
 * blocks, "---" rules, **bold**, *emphasis*, `code` and bare links.
 * Built as React elements, never HTML, so nothing in the text can run.
 */
export function Markdown({ text, className }: { text: string; className?: string }) {
  return <div className={className}>{blocks(text.replace(/\r\n/g, "\n"))}</div>;
}

type Line = { indent: number; kind: "ul" | "ol" | "p"; text: string };

function parse(line: string): Line {
  const indent = line.match(/^\s*/)![0].length;
  const body = line.trim();
  const ul = body.match(/^[-*•]\s+(.*)$/);
  if (ul) return { indent, kind: "ul", text: ul[1] };
  const ol = body.match(/^\d+[.)]\s+(.*)$/);
  if (ol) return { indent, kind: "ol", text: ol[1] };
  return { indent, kind: "p", text: body };
}

function blocks(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Code blocks first, whole: blank lines inside them are not paragraph breaks.
  const parts = text.split(/^```[^\n]*\n([\s\S]*?)^```[ \t]*$/m);
  parts.forEach((part, k) => {
    if (k % 2) out.push(<pre key={`c${k}`} className="mt-3 overflow-x-auto rounded-lg bg-surface/60 p-4 text-sm">{part.replace(/\n$/, "")}</pre>);
    else out.push(...prose(part, k));
  });
  return out;
}

function prose(text: string, k: number): ReactNode[] {
  const out: ReactNode[] = [];
  const paras = text.split(/\n{2,}/);
  paras.forEach((para, pi) => {
    const raw = para.split("\n").filter((l) => l.trim());
    if (raw.length === 1 && /^-{3,}$/.test(raw[0].trim())) {
      out.push(<hr key={`r${k}-${pi}`} className="my-5 border-line/30" />);
      return;
    }
    const heading = raw[0]?.trim().match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      out.push(<p key={`h${k}-${pi}`} className="mt-5 text-base font-extrabold text-ink first:mt-0">{inline(heading[1])}</p>);
      raw.shift();
    }
    const lines = raw.map(parse);
    let i = 0;
    while (i < lines.length) {
      if (lines[i].kind === "p") {
        const run: Line[] = [];
        while (i < lines.length && lines[i].kind === "p") run.push(lines[i++]);
        out.push(
          <p key={`p${k}-${pi}-${i}`} className="mt-3 first:mt-0">
            {run.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l.text)}</Fragment>)}
          </p>,
        );
      } else {
        const start = i;
        while (i < lines.length && lines[i].kind !== "p") i++;
        out.push(<Fragment key={`l${k}-${pi}-${start}`}>{list(lines.slice(start, i))}</Fragment>);
      }
    }
  });
  return out;
}

/** A run of list lines, nested by indentation. */
function list(lines: Line[]): ReactNode {
  const base = lines[0].indent;
  const items: { line: Line; children: Line[] }[] = [];
  for (const l of lines) {
    if (l.indent > base && items.length) items[items.length - 1].children.push(l);
    else items.push({ line: l, children: [] });
  }
  const Tag = lines[0].kind === "ol" ? "ol" : "ul";
  return (
    <Tag className={`mt-3 space-y-1.5 pl-5 ${Tag === "ol" ? "list-decimal" : "list-disc"}`}>
      {items.map((it, i) => (
        <li key={i}>
          {inline(it.line.text)}
          {it.children.length > 0 && list(it.children)}
        </li>
      ))}
    </Tag>
  );
}

const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|https?:\/\/[^\s)]+)/g;

function inline(text: string): ReactNode[] {
  return text.split(TOKEN).filter(Boolean).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="font-bold text-ink">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="rounded bg-surface px-1 py-0.5 text-[0.9em]">{part.slice(1, -1)}</code>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    if (/^https?:\/\//.test(part)) return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2 break-all">{part}</a>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}
