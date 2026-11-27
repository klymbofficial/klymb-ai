"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { readJobDescription } from "@/app/org/[slug]/(workspace)/assessments/jd-actions";
import { createAutoTest, createOwnTest, publishOwnTest, type AutoResult } from "@/app/org/[slug]/(workspace)/assessments/test-actions";
import { CandidatePreview } from "@/components/company/AssessmentParts";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/company/HiringParts";
import { OrgIcon } from "@/components/company/OrgIcons";
import { Overlay } from "@/components/company/Overlay";
import { LIMITS, TEST_NAME_MAX, minutesLabel } from "@/lib/company/assessment-rules";
import { AUTO_LIMITS, LEVELS, LEVEL_LABEL, availability, plannedMix, type AssessmentRole, type Level, type PoolItem } from "@/lib/company/auto-test";
import { JD_LIMITS, type JdProposal } from "@/lib/company/jd-rules";

const input = "w-full rounded-md border-2 border-line/50 bg-white px-3 py-2 text-sm focus:border-ink";
const label = "flex flex-col gap-1 text-sm font-bold";

type Done = Extract<AutoResult, { ok: true }>;

/**
 * Create assessment (P0.2b / P0.4): a modal over the Assessments list. Pick a
 * job role and Automatic (the default), From a job description, or Manual.
 * From a job description (user, 26 Nov) reads a pasted or uploaded
 * description with AI and fills in the role, level and skills, which the
 * recruiter checks and changes before creating. Automatic shows the role's
 * skills as chips, how many questions match, and the planned mix; Create
 * picks the questions on the server and shows a summary with Preview,
 * Publish and Add candidates, without leaving the list. Manual makes the
 * test and opens the editor. Closing with unsaved choices asks first.
 */

export function CreateAssessment({ slug, roles, pool, startOpen = false }: { slug: string; roles: AssessmentRole[]; pool: PoolItem[]; startOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  // Opened by a link (?create=1): the dialog's portal exists only in the browser, so the server renders it closed
  // and it opens once mounted. Setting state here is the point: it must not happen during hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (startOpen) setOpen(true); }, [startOpen]);
  return (
    <>
      <button type="button" className={BTN_PRIMARY} onClick={() => { setSession((n) => n + 1); setOpen(true); }}>
        <OrgIcon name="plus" size={16} />Create assessment
      </button>
      <CreateDialog key={session} slug={slug} roles={roles} pool={pool} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function CreateDialog({ slug, roles, pool, open, onClose }: { slug: string; roles: AssessmentRole[]; pool: PoolItem[]; open: boolean; onClose: () => void }) {
  const [createKey] = useState(() => crypto.randomUUID());
  const [mode, setMode] = useState<"auto" | "jd" | "manual">("auto");
  const [level, setLevel] = useState<Level>("mid");
  const [jdText, setJdText] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [proposal, setProposal] = useState<JdProposal | null>(null);
  const [audience, setAudience] = useState<"external" | "internal">("external");
  const [title, setTitle] = useState("");
  const [roleSlug, setRoleSlug] = useState(roles[0]?.slug ?? "");
  const [manualRole, setManualRole] = useState("");
  const role = roles.find((r) => r.slug === roleSlug) ?? null;
  const [skills, setSkills] = useState<string[]>(role?.skills ?? []);
  const [count, setCount] = useState<number>(AUTO_LIMITS.default);
  const [adding, setAdding] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [view, setView] = useState<"form" | "summary" | "preview">("form");
  const [published, setPublished] = useState<string | null>(null);
  const [pending, go] = useTransition();

  const avail = useMemo(() => availability(pool, skills), [pool, skills]);
  const allTags = useMemo(() => [...new Set(pool.filter((q) => q.type === "mcq" && q.status === "published").flatMap((q) => q.tags))].sort((a, b) => a.localeCompare(b)), [pool]);
  const mix = plannedMix(count, level);
  const picking = mode === "auto" || (mode === "jd" && !!proposal);
  const empty = skills.filter((s) => !avail.bySkill[s]);
  const short = avail.total < count;
  const dirty = !done && (title.trim() !== "" || manualRole.trim() !== "" || audience !== "external" || jdText.trim() !== "" || !!jdFile);

  const pickRole = (slugValue: string) => {
    setRoleSlug(slugValue);
    setSkills(roles.find((r) => r.slug === slugValue)?.skills ?? []);
  };

  const createAuto = () => go(async () => {
    setError(null);
    try {
      const out = await createAutoTest({ slug, title, role: roleSlug, skills, count, audience, createKey, level, fromJd: mode === "jd" });
      if (!out.ok) { setError(out.message); return; }
      setDone(out);
      setView("summary");
    } catch {
      setError("That didn't work just now. Try again in a minute; pressing again won't make a second test.");
    }
  });

  const readJd = () => go(async () => {
    setError(null);
    const fd = new FormData();
    fd.set("slug", slug);
    fd.set("text", jdText);
    if (jdFile) fd.set("file", jdFile);
    try {
      const out = await readJobDescription(fd);
      if (!out.ok) { setError(out.message); return; }
      const p = out.proposal;
      setProposal(p);
      if (!title.trim()) setTitle(p.title);
      if (p.role && roles.some((r) => r.slug === p.role)) setRoleSlug(p.role);
      setSkills(p.skills.map((x) => x.skill));
      setLevel(p.level);
    } catch {
      setError("Reading that didn't work just now. Try again in a minute.");
    }
  });

  const publish = () => go(async () => {
    if (!done) return;
    setError(null);
    try {
      const out = await publishOwnTest(slug, done.item, done.revision);
      if (!out.ok) { setError(out.message); return; }
      setPublished(out.message);
    } catch {
      setError("That didn't publish just now. Try again in a minute.");
    }
  });

  const base = `/org/${slug}/assessments`;
  const title_ = done ? (view === "preview" ? `Preview: ${done.title}` : "Assessment created") : "Create assessment";

  return (
    <Overlay
      open={open}
      onClose={onClose}
      title={title_}
      description={done ? (view === "preview" ? "Candidate view" : `${done.role} · ${published ? "published" : "draft"}`) : undefined}
      size={view === "preview" ? "lg" : "md"}
      dirty={dirty}
      footer={
        done ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {view === "preview"
              ? <button type="button" className={BTN_SECONDARY} onClick={() => setView("summary")}>Back to summary</button>
              : <button type="button" className={BTN_SECONDARY} onClick={() => setView("preview")}>Preview</button>}
            <Link href={`${base}/${done.item}/edit`} className={BTN_SECONDARY}>Edit questions</Link>
            {published
              ? <Link href={`${base}/${done.item}?tab=candidates&invite=1`} className={BTN_PRIMARY}>{done.audience === "internal" ? "Assign employees" : "Invite candidates"}</Link>
              : <button type="button" className={BTN_PRIMARY} disabled={pending} onClick={publish}>{pending ? "Publishing…" : "Publish"}</button>}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" className={BTN_SECONDARY} onClick={onClose}>Cancel</button>
            {mode === "jd" && !proposal ? (
              <button type="button" className={BTN_PRIMARY} disabled={pending || (jdText.trim().length < JD_LIMITS.minText && !jdFile)} onClick={readJd}>
                {pending ? "Reading…" : "Read job description"}
              </button>
            ) : picking ? (
              <button type="button" className={BTN_PRIMARY} disabled={pending || !title.trim() || !role || !skills.length || short || empty.length > 0} onClick={createAuto}>
                {pending ? "Creating…" : `Create with ${count} questions`}
              </button>
            ) : (
              <button type="submit" form="create-manual" className={BTN_PRIMARY} disabled={pending || !title.trim()}>{pending ? "Creating…" : "Create and open the editor"}</button>
            )}
          </div>
        )
      }
    >
      {done && view === "preview" ? (
        <CandidatePreview t={done.task} />
      ) : done ? (
        <div className="flex flex-col gap-5">
          <p className="text-base font-bold">{done.title}</p>
          <dl className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            {[["Audience", done.audience === "internal" ? "Internal employees" : "External candidates"], ["Questions", String(done.count)], ["Points", String(done.points)], ["Time", minutesLabel(done.minutes)]].map(([k, v]) => (
              <div key={k} className="rounded-md border border-line/30 bg-white p-3"><dt className="text-xs font-bold text-muted">{k}</dt><dd className="mt-1 text-lg font-black">{v}</dd></div>
            ))}
          </dl>
          {!done.existed && <MixBar mix={done.mix} />}
          {done.adapted && <p className="text-sm text-[#6b3300]">Not enough questions at one difficulty, so the mix was adjusted (planned {done.planned.easy} easy · {done.planned.medium} medium · {done.planned.hard} hard).</p>}
          {done.existed && <p className="text-sm text-muted">This press had already created the test, so nothing new was made.</p>}
          <p className="text-sm text-muted">
            {published ?? "It's a draft: preview it, then publish to invite people. You can change the time and questions in the editor before publishing."}
          </p>
          {error && <p role="alert" className="text-sm font-semibold text-error">{error}</p>}
          <Link href={`${base}/${done.item}`} className="text-sm font-semibold underline underline-offset-4">Open assessment</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <label className={label}>
            Test name
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={TEST_NAME_MAX} placeholder="e.g. Backend developer screen" className={input} data-autofocus="" />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-bold">Who is this assessment for?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {([["external", "External candidates"], ["internal", "Internal employees"]] as const).map(([value, heading]) => (
                <label key={value} className={clsx("flex cursor-pointer items-center gap-2 rounded-md border-2 p-3 text-sm", audience === value ? "border-ink bg-white" : "border-line/40")}>
                  <input type="radio" name="audience" value={value} checked={audience === value} onChange={() => setAudience(value)} />
                  <span className="font-bold">{heading}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-bold">How to build it</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {([["auto", "Automatically"], ["jd", "From a job description"], ["manual", "Manually"]] as const).map(([v, t]) => (
                <label key={v} className={clsx("flex cursor-pointer items-center gap-2 rounded-md border-2 p-3 text-sm", mode === v ? "border-ink bg-white" : "border-line/40")}>
                  <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} />
                  <span className="font-bold">{t}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {mode === "jd" && !proposal && (
            <div className="flex flex-col gap-3">
              <label className={label}>
                Job description
                <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} maxLength={JD_LIMITS.text} rows={7} placeholder="Paste the job description here…" className={`${input} font-normal`} />
              </label>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className={clsx(BTN_SECONDARY, "cursor-pointer")}>
                  <input type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0] ?? null; setJdFile(f && f.size > JD_LIMITS.fileBytes ? null : f); setError(f && f.size > JD_LIMITS.fileBytes ? "That file is over 900 KB. Paste the text instead." : null); }} />
                  {jdFile ? "Change file" : "Upload a file"}
                </label>
                {jdFile ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="font-semibold">{jdFile.name}</span>
                    <button type="button" onClick={() => setJdFile(null)} className="text-muted underline underline-offset-2">Remove</button>
                  </span>
                ) : <span className="text-muted">PDF, Word (.docx) or .txt, up to 900 KB</span>}
              </div>
              <p className="text-xs text-muted">AI reads it and suggests the skills, level and role; you check everything before the test is made. Questions come only from the reviewed Library. The description is sent to OpenAI to read and isn&apos;t kept.</p>
            </div>
          )}

          {mode === "jd" && proposal && (
            <div className="rounded-md border border-line/30 bg-white p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold">Suggested from the job description</p>
                <button type="button" onClick={() => setProposal(null)} className="text-sm font-semibold underline underline-offset-4">Read another</button>
              </div>
              {proposal.summary && <p className="mt-1 text-muted">{proposal.summary}{proposal.years ? ` · asks for ${proposal.years}+ years` : ""}</p>}
              {proposal.missing.length > 0 && <p className="mt-2 text-[#6b3300]">Not in the Library yet: {proposal.missing.join(", ")}. Add your own questions for these in the editor if they matter.</p>}
              <details className="mt-2">
                <summary className="cursor-pointer font-semibold">Why these skills</summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {proposal.skills.map((x) => <li key={x.skill}><strong>{x.skill}</strong>{x.evidence && <span className="text-muted">: “{x.evidence}”</span>}</li>)}
                </ul>
              </details>
            </div>
          )}

          {picking ? (
            <>
              <label className={label}>
                Job role
                <select value={roleSlug} onChange={(e) => pickRole(e.target.value)} className={input}>
                  {roles.map((r) => <option key={r.slug} value={r.slug}>{r.label}</option>)}
                </select>
              </label>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-bold">Skills</p>
                <ul className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <li key={s}>
                      <span className={clsx("inline-flex items-center gap-1 rounded-full border-2 py-0.5 pl-3 pr-1 text-sm", avail.bySkill[s] ? "border-ink/70 bg-white" : "border-error text-error")}>
                        {s} <span className="text-xs text-muted">{avail.bySkill[s] ?? 0}</span>
                        <button type="button" aria-label={`Remove ${s}`} onClick={() => setSkills((x) => x.filter((y) => y !== s))} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-line/20">
                          <OrgIcon name="close" size={12} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <select value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Add a skill" className={`${input} max-w-60`}>
                    <option value="">Add a skill…</option>
                    {allTags.filter((t) => !skills.some((s) => s.toLowerCase() === t.toLowerCase())).map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button type="button" className={BTN_SECONDARY} disabled={!adding || skills.length >= AUTO_LIMITS.skills} onClick={() => { setSkills((x) => [...x, adding]); setAdding(""); }}>Add</button>
                </div>
              </div>

              <label className={label}>
                Experience level
                <select value={level} onChange={(e) => setLevel(e.target.value as Level)} className={`${input} max-w-72`}>
                  {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-end">
                <label className={label}>
                  Questions
                  <input type="number" min={AUTO_LIMITS.min} max={AUTO_LIMITS.max} value={count}
                    onChange={(e) => setCount(Math.max(AUTO_LIMITS.min, Math.min(AUTO_LIMITS.max, Number(e.target.value) || AUTO_LIMITS.default)))} className={input} />
                </label>
                <div className="rounded-md border border-line/30 bg-white p-3 text-sm">
                  <p><strong>{avail.total}</strong> available · {mix.easy} easy · {mix.medium} medium · {mix.hard} hard</p>
                </div>
              </div>
              {(short || empty.length > 0) && (
                <p role="alert" className="text-sm font-semibold text-error">
                  {empty.length > 0
                    ? `No questions cover ${empty.join(", ")} yet. Remove ${empty.length === 1 ? "it" : "them"}, or choose Manually.`
                    : `Only ${avail.total} questions match. Ask for ${avail.total} or fewer, add skills, or choose Manually.`}
                </p>
              )}
              {!roles.length && <p role="alert" className="text-sm font-semibold text-error">No job roles are set up yet. Choose Manually, or ask Klymb.</p>}
            </>
          ) : mode === "jd" ? null : (
            <form id="create-manual" action={(fd) => go(async () => { setError(null); const out = await createOwnTest(null, fd); if (out && !out.ok) setError(out.message); })} className="flex flex-col gap-4">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="title" value={title} />
              <input type="hidden" name="audience" value={audience} />
              <label className={label}>
                Role it tests <span className="font-normal text-muted">(optional)</span>
                <input name="role" value={manualRole} onChange={(e) => setManualRole(e.target.value)} maxLength={LIMITS.role} placeholder="e.g. Backend engineer" className={input} />
              </label>
            </form>
          )}
          {error && <p role="alert" className="text-sm font-semibold text-error">{error}</p>}
        </div>
      )}
    </Overlay>
  );
}

function MixBar({ mix }: { mix: { easy: number; medium: number; hard: number } }) {
  const total = mix.easy + mix.medium + mix.hard || 1;
  const parts = [["Easy", mix.easy, "bg-[#2f7d4f]"], ["Medium", mix.medium, "bg-[#b26a00]"], ["Hard", mix.hard, "bg-[#a3261e]"]] as const;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label={`Difficulty: ${mix.easy} easy, ${mix.medium} medium, ${mix.hard} hard`}>
        {parts.map(([k, n, c]) => n > 0 && <span key={k} className={c} style={{ width: `${(100 * n) / total}%` }} />)}
      </div>
      <p className="mt-1 flex gap-4 text-xs text-muted">{parts.map(([k, n]) => <span key={k}>{k} {n}</span>)}</p>
    </div>
  );
}
