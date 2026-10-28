"use client";

import clsx from "clsx";
import type { NotifType } from "@/data/system-design/course-app";
import {
  STORAGE_MB, downloadModule, lesson, missingDownloads, openLesson, openNotification, pad, removeDownload, type CourseState,
} from "@/lib/course-app";
import { Icon, type IconName } from "../icons";
import { BackButton, Bar, EmptyState, ScreenTitle, stagger } from "../ui";
import type { Act } from "../useCourseApp";

const NOTIF_ICON: Record<NotifType, IconName> = { reply: "msg", streak: "flame", badge: "award", module: "layers", assess: "target" };

export function Notifications({ s, act }: { s: CourseState; act: Act }) {
  const back = () => act((p) => ({ ...p, screen: p.tab }));
  const unread = s.notifs.some((n) => n.unread);
  const groups = (["Today", "Earlier"] as const).map((g) => ({ g, items: s.notifs.filter((n) => n.group === g) })).filter((x) => x.items.length);
  return (
    <div className="sd-a-screen flex max-w-[760px] flex-col gap-[18px] px-5 pb-7 lg:p-0">
      <div className="-mx-2 lg:mx-0"><BackButton onClick={back} /></div>
      <ScreenTitle aside={unread && <button type="button" onClick={() => act((p) => ({ ...p, notifs: p.notifs.map((n) => ({ ...n, unread: false })) }))} className="sd-btn sd-btn-ghost">Mark all read</button>}>Notifications</ScreenTitle>
      {groups.length > 0 ? (
        <>
          {groups.map(({ g, items }) => (
            <div key={g}>
              <h6 className="sd-h6 mb-2">{g}</h6>
              <div className="border-t-2 border-sd-divider">
                {items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => act((p) => openNotification(p, n))}
                    className={clsx("sd-a-in grid w-full cursor-pointer grid-cols-[36px_1fr_8px] items-start gap-3 border-b border-sd-divider px-2 py-3.5 text-left hover:bg-sd-n-200", n.unread && "bg-sd-accent-100")}
                    style={{ animationDuration: ".45s" }}
                  >
                    <span className={clsx("flex size-9 items-center justify-center rounded-lg text-sd-bg", n.unread ? "bg-sd-accent" : "bg-sd-ink")}><Icon name={NOTIF_ICON[n.type]} size={18} /></span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm leading-[1.3] font-extrabold">{n.title}</span>
                      <span className="text-[13px] leading-[1.4] text-sd-n-800">{n.body}</span>
                      <span className="text-xs text-sd-n-700">{n.time}</span>
                    </span>
                    {n.unread && <span className="mt-1.5 size-2 rounded-full bg-sd-accent"><span className="sr-only">Unread</span></span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div><button type="button" onClick={() => act((p) => ({ ...p, notifs: [] }))} className="sd-btn sd-btn-secondary">Clear all</button></div>
        </>
      ) : (
        <EmptyState
          icon="bell"
          titleClass="text-[28px] tracking-[-0.03em]"
          title="All caught up"
          body="Replies, reminders and new days show up here."
          action={<button type="button" onClick={back} className="sd-btn sd-btn-primary h-11 gap-2">Back to learning<Icon name="arrowR" size={16} /></button>}
        />
      )}
    </div>
  );
}

export function Downloads({ s, act }: { s: CourseState; act: Act }) {
  const used = s.dl.reduce((a, x) => a + x.size, 0);
  const rows = [
    ...s.dl.map((x) => ({ id: x.id, size: x.size as number | null, prog: null as number | null })),
    ...Object.keys(s.dlProg).map((id) => ({ id, size: null, prog: s.dlProg[id] })),
  ];
  const canDlMod = missingDownloads(s).length > 0;
  return (
    <div className="sd-a-screen flex max-w-[760px] flex-col gap-[18px] px-5 pb-7 lg:p-0">
      <div className="-mx-2 lg:mx-0"><BackButton onClick={() => act((p) => ({ ...p, screen: p.tab }))} /></div>
      <ScreenTitle>Downloads</ScreenTitle>
      <div className="flex flex-col gap-1.5 rounded-xl bg-sd-surface p-3.5">
        <div className="flex justify-between text-[13px]"><span className="font-extrabold">{used} MB used by Klymb</span><span>{s.dl.length} lessons</span></div>
        <Bar value={(used / STORAGE_MB) * 100} className="h-1.5" />
        <span className="text-xs text-sd-n-700">Play offline for 30 days.</span>
      </div>
      {canDlMod && (
        <div>
          <button type="button" onClick={() => act(downloadModule)} className="sd-btn sd-btn-secondary h-11 gap-2"><Icon name="download" size={16} />Download all of Module {pad(lesson(s.cur).mi + 1)}</button>
        </div>
      )}
      {rows.length > 0 ? (
        <div className="border-t-2 border-sd-divider">
          {rows.map((x, i) => {
            const l = lesson(x.id);
            const open = () => act((p) => openLesson(p, x.id));
            return (
              <div key={x.id} className="sd-a-in grid grid-cols-[44px_minmax(0,1fr)_40px] items-center gap-3 border-b border-sd-divider py-3" style={{ ...stagger(i, 60, 80), animationDuration: ".45s" }}>
                <button type="button" onClick={open} aria-label={`Open ${l.title}`} className="size-11 cursor-pointer rounded-lg bg-sd-ink text-xs font-extrabold text-sd-bg">{l.code}</button>
                <button type="button" onClick={open} className="flex min-w-0 cursor-pointer flex-col gap-1 p-0 text-left">
                  <span className="text-sm font-semibold">{l.title}</span>
                  <span className="text-xs text-sd-n-700">{l.m.title} · {x.prog !== null ? `Downloading · ${Math.floor(x.prog)}%` : `${x.size} MB · ${l.dur}`}</span>
                  {x.prog !== null && <Bar value={x.prog} className="block h-1 w-full" fillClass="bg-sd-accent transition-[width]! duration-1000! ease-linear" />}
                </button>
                <button type="button" onClick={() => act((p) => removeDownload(p, x.id))} aria-label="Remove download" className="sd-btn sd-btn-secondary sd-btn-icon size-10"><Icon name="trash" size={16} /></button>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="download"
          title="No downloads yet"
          body="Watch lessons without internet."
          action={<button type="button" onClick={() => act((p) => ({ ...p, screen: "course", tab: "course" }))} className="sd-btn sd-btn-primary h-11 gap-2">Browse the course<Icon name="arrowR" size={16} /></button>}
        />
      )}
    </div>
  );
}
