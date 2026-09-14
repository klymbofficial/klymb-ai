import type { Source } from "@/types/program";

export function SourceLink({ source }: { source: Source }) {
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-muted underline underline-offset-2 hover:text-red-deep">
      Source: {source.label}
    </a>
  );
}
