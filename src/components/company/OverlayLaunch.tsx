"use client";

import { useEffect, useState } from "react";
import { BatchForm } from "@/components/company/BatchForm";
import { OrgIcon, type OrgIconName } from "@/components/company/OrgIcons";
import { Overlay } from "@/components/company/Overlay";

/**
 * A button that opens server-rendered content in the shared overlay, over the
 * page it's on (P0.2c): Preview on a test page. `startOpen` opens it on
 * arrival, for links that ask for it.
 */
export function OverlayLaunch({
  label, icon, className, title, description, kind = "drawer", size = "lg", startOpen = false, children,
}: {
  label: string;
  icon?: OrgIconName;
  className: string;
  title: string;
  description?: string;
  kind?: "modal" | "drawer";
  size?: "sm" | "md" | "lg";
  startOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(startOpen);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{icon && <OrgIcon name={icon} size={16} />}{label}</button>
      <Overlay open={open} onClose={() => setOpen(false)} title={title} description={description} kind={kind} size={size}>{children}</Overlay>
    </>
  );
}

/**
 * Invite candidates inside the test (P0.2c): the round form in a drawer, the
 * test already chosen. Saving makes a draft round and moves to it on the
 * Candidates tab; nothing is sent from here. Closing with people typed in
 * asks first.
 */
export function InviteOverlay({ className, startOpen = false, form }: { className: string; startOpen?: boolean; form: Omit<React.ComponentProps<typeof BatchForm>, "onDirtyChange" | "onDone"> }) {
  const [open, setOpen] = useState(startOpen);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("company:invite-candidates", show);
    return () => window.removeEventListener("company:invite-candidates", show);
  }, []);
  const close = () => {
    setOpen(false);
    setDirty(false);
    // Make the empty-state link reusable after a drawer opened from ?invite=1.
    const url = new URL(window.location.href);
    if (url.searchParams.has("invite")) {
      url.searchParams.delete("invite");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  };
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}><OrgIcon name="invite" size={16} />Invite candidates</button>
      <Overlay
        open={open}
        onClose={close}
        title="Invite candidates"
        description="Choose the people and invitation window."
        kind="drawer"
        size="lg"
        dirty={dirty}
      >
        <BatchForm {...form} onDirtyChange={setDirty} onDone={close} />
      </Overlay>
    </>
  );
}

/** Opens the page's existing invite drawer from its empty candidate panel. */
export function InviteCandidatesAction({ className }: { className: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event("company:invite-candidates"))}>
      Invite candidates
    </button>
  );
}
